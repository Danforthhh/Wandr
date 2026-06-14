import { Trip, Activity, ItineraryDay, PackingItem, TripContext, TripContextFile, MustDo } from '../types';
import { logActivity } from './activityLog';
import { logger } from './logger';
import i18n from '../i18n';

// ─── API key store (set by App.tsx after decryption) ─────────────────────────
let _claudeKey: string | null = null;
let _pplxKey:   string | null = null;

export function setApiKeys(claude: string | null, pplx: string | null) {
  _claudeKey = claude;
  _pplxKey   = pplx;
}

// ─── Routing ──────────────────────────────────────────────────────────────────
// DEV:  free Cloudflare Worker proxy (Groq + Tavily) — no key needed
// PROD: direct calls to api.anthropic.com / api.perplexity.ai with user keys

const WORKER_DEV = 'https://dev-proxy.vin-bories.workers.dev';

// Mirror App.tsx default: free unless explicitly set to 'false'
function devMode() { return localStorage.getItem('devMode') !== 'false'; }

function claudeUrl() {
  return devMode()
    ? `${WORKER_DEV}/anthropic/v1/messages`
    : 'https://api.anthropic.com/v1/messages';
}

function pplxUrl() {
  return devMode()
    ? `${WORKER_DEV}/perplexity/chat/completions`
    : 'https://api.perplexity.ai/chat/completions';
}

function claudeHeaders(): Record<string, string> {
  if (devMode()) return { 'Content-Type': 'application/json' };
  if (!_claudeKey) throw new Error('No Anthropic API key — add it in Settings.');
  return {
    'Content-Type':                          'application/json',
    'x-api-key':                             _claudeKey,
    'anthropic-version':                     '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

function pplxHeaders(): Record<string, string> {
  if (devMode()) return { 'Content-Type': 'application/json' };
  if (!_pplxKey) throw new Error('No Perplexity API key — add it in Settings.');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${_pplxKey}`,
  };
}

// ─── Perplexity ───────────────────────────────────────────────────────────────

const PPLX_MODEL        = 'sonar-pro';
const PPLX_SEARCH_MODEL = 'sonar';

type ApiMessage  = { role: 'user' | 'assistant'; content: string };
type FullMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function callPerplexity(
  messages: ApiMessage[],
  system: string,
  options: { maxTokens?: number; model?: string } = {}
): Promise<string> {
  const { maxTokens = 8192, model = PPLX_MODEL } = options;
  const allMessages: FullMessage[] = [{ role: 'system', content: system }, ...messages];

  logger.debug('ai.perplexity', `Request → ${model}`, {
    model, maxTokens,
    lastUserMessage: messages[messages.length - 1]?.content?.slice(0, 200),
  });

  const res = await fetch(pplxUrl(), {
    method: 'POST',
    headers: pplxHeaders(),
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: allMessages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const msg = err?.error?.message || `Perplexity API error ${res.status}`;
    logger.error('ai.perplexity', `HTTP ${res.status}`, { status: res.status, message: msg });
    throw new Error(msg);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty or unexpected response from Perplexity');
  logger.debug('ai.perplexity', `Response (${text.length} chars)`, { preview: text.slice(0, 300) });
  return text;
}

// ─── Claude ───────────────────────────────────────────────────────────────────

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

async function callClaude(
  userContent: string | ClaudeContentBlock[],
  system: string,
  options: { maxTokens?: number } = {}
): Promise<string> {
  const { maxTokens = 8192 } = options;

  const preview = typeof userContent === 'string'
    ? userContent.slice(0, 200)
    : userContent.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join(' ').slice(0, 200);
  logger.debug('ai.claude', `Request → ${CLAUDE_MODEL}`, {
    model: CLAUDE_MODEL, maxTokens,
    blocks: Array.isArray(userContent) ? userContent.map(b => b.type) : 'text',
    preview,
  });

  const res = await fetch(claudeUrl(), {
    method: 'POST',
    headers: claudeHeaders(),
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const raw = err?.error?.message || `Claude API error ${res.status}`;
    logger.error('ai.claude', `HTTP ${res.status}`, { status: res.status, message: raw });
    if (res.status === 401 || raw.toLowerCase().includes('api-key') || raw.toLowerCase().includes('authentication')) {
      throw new Error('Invalid Claude API key — please check your Anthropic key in Settings.');
    }
    throw new Error(raw);
  }

  const data = await res.json() as { content?: { type: string; text: string }[] };
  const block = data.content?.find(b => b.type === 'text');
  if (!block) throw new Error('No text content in Claude response');
  logger.debug('ai.claude', `Response (${block.text.length} chars)`, { preview: block.text.slice(0, 300) });
  return block.text;
}

// ─── Context → Claude content blocks ─────────────────────────────────────────

export function buildClaudeContent(prompt: string, context?: TripContext): string | ClaudeContentBlock[] {
  if (!context?.text && !context?.files?.length) return prompt;

  const files     = context.files ?? [];
  const imgFiles  = files.filter(f => f.mimeType.startsWith('image/'));
  const pdfFiles  = files.filter(f => f.mimeType === 'application/pdf');
  const txtFiles  = files.filter(f => f.mimeType === 'text/plain' || f.mimeType === 'text/markdown');

  if (!imgFiles.length && !pdfFiles.length) {
    let enriched = '';
    if (context.text) enriched += `User notes: ${context.text}\n\n`;
    for (const f of txtFiles) {
      try { enriched += `--- ${f.name} ---\n${atob(f.dataBase64)}\n\n`; } catch { /* skip */ }
    }
    return enriched + prompt;
  }

  const blocks: ClaudeContentBlock[] = [];
  for (const f of imgFiles) {
    blocks.push({ type: 'image', source: { type: 'base64', media_type: f.mimeType, data: f.dataBase64 } });
  }
  for (const f of pdfFiles) {
    blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.dataBase64 } });
  }

  let text = '';
  if (context.text) text += `User notes: ${context.text}\n\n`;
  for (const f of txtFiles) {
    try { text += `--- ${f.name} ---\n${atob(f.dataBase64)}\n\n`; } catch { /* skip */ }
  }
  text += prompt;
  blocks.push({ type: 'text', text });

  return blocks;
}

// ─── Generation helper ────────────────────────────────────────────────────────

async function callGeneration(
  prompt: string,
  system: string,
  context?: TripContext,
  options: { maxTokens?: number } = {}
): Promise<string> {
  const content = buildClaudeContent(prompt, context);
  return callClaude(content, system, options);
}

// ─── JSON parse / shape helpers ───────────────────────────────────────────────

export function asArray<T>(parsed: unknown): T[] {
  if (Array.isArray(parsed)) return parsed as T[];
  if (parsed && typeof parsed === 'object') {
    for (const val of Object.values(parsed as Record<string, unknown>)) {
      if (Array.isArray(val) && val.length > 0) return val as T[];
    }
  }
  throw new Error(`AI returned an unexpected format. Please try again.`);
}

export function extractBalanced(text: string, start: number, open: string, close: string): string | null {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === open)  { depth++; continue; }
    if (ch === close) { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

export function parseJSON<T>(raw: string): T {
  const stripped = raw
    .replace(/^```(?:json|JSON)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();

  for (const candidate of [stripped, raw]) {
    try { return JSON.parse(candidate) as T; } catch { /* try next strategy */ }

    const objIdx = candidate.indexOf('{');
    const arrIdx = candidate.indexOf('[');
    const pairs: Array<[number, string, string]> = [];
    if (objIdx !== -1) pairs.push([objIdx, '{', '}']);
    if (arrIdx !== -1) pairs.push([arrIdx, '[', ']']);
    pairs.sort((a, b) => a[0] - b[0]);

    for (const [start, open, close] of pairs) {
      const extracted = extractBalanced(candidate, start, open, close);
      if (!extracted) continue;
      try { return JSON.parse(extracted) as T; } catch { /* try next */ }
    }
  }

  logger.error('ai.parse', 'JSON parse failed — full raw response below', { raw });
  throw new Error('AI returned an unexpected format. Please try again.');
}

// ─── Trip Overview ────────────────────────────────────────────────────────────

interface TripOverview {
  name: string;
  emoji: string;
  description: string;
  coverGradient: string;
}

export async function generateTripDetails(params: {
  destination: string;
  startDate: string;
  endDate: string;
  interests: string[];
  budget: number;
  travelers: number;
  context?: TripContext;
}): Promise<TripOverview> {
  const { destination, startDate, endDate, interests, budget, travelers, context } = params;

  const actId = logActivity({ message: `Creating trip to ${destination}…`, status: 'pending' });

  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const langInstruction = lang === 'fr' ? ' Generate all text content values in French, but keep JSON property names in English.' : '';

  const prompt = `Trip to ${destination} (${startDate} → ${endDate}).
Interests: ${interests.join(', ')}. Budget: $${budget}. Travelers: ${travelers}.

Fill in this JSON exactly (no other text):
{
  "name": "<catchy 3-5 word trip name>",
  "emoji": "<single emoji>",
  "description": "<2 sentences about this trip>",
  "coverGradient": "<exactly one of: from-violet-900 to-indigo-900 | from-blue-900 to-cyan-900 | from-emerald-900 to-teal-900 | from-rose-900 to-pink-900 | from-amber-900 to-orange-900 | from-slate-900 to-blue-900>"
}`;

  try {
    const text = await callGeneration(
      prompt,
      `You are a travel expert. Respond with ONLY a valid JSON object — no markdown, no code fences, no explanation. Raw JSON only.${langInstruction}`,
      context,
      { maxTokens: 512 }
    );
    const result = parseJSON<TripOverview>(text);
    logActivity({ message: `Trip "${result.name}" created`, status: 'success' }, actId);
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    logActivity({ message: 'Failed to create trip', detail: msg, status: 'error' }, actId);
    throw e;
  }
}

// ─── Must-dos extraction ──────────────────────────────────────────────────────

export async function extractMustDos(notes: string, destination: string): Promise<MustDo[]> {
  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const langInstruction = lang === 'fr'
    ? ' Keep city names as the user wrote them. Return all item text in French.'
    : ' Keep city names as the user wrote them.';

  const prompt = `Parse this trip description and extract must-do activities organized by city.
Destination: ${destination}
Text: "${notes}"

Return a JSON array. Each object: {"city":"City name","items":["Activity or place 1","Activity or place 2"]}
Rules:
- Only include places or activities EXPLICITLY mentioned by the user
- Do NOT invent or suggest additional activities
- Group by city/region as the user described them
- If no specific activities are mentioned, return []
- Prefix each item with a realistic time-of-day indicator when relevant, separated by " : "
  Examples: "Matin : Marché de Dong Xuan", "Demi-journée : Visite du temple", "Soirée : Balade dans le Vieux Quartier", "Journée : Excursion baie d'Ha Long"
  Use "Demi-journée", "Matin", "Après-midi", "Soirée", "Journée" or a duration like "2h"
- Correct any obvious city or place name typos (e.g. "Foucoque" → "Phố Cổ", "Sapare" → "Sapa")`;

  try {
    const text = await callGeneration(
      prompt,
      `You are a travel planning assistant. Respond with ONLY a valid JSON array — no markdown, no code fences, no explanation. Raw JSON array only.${langInstruction}`,
      undefined,
      { maxTokens: 1024 }
    );
    const result = asArray<MustDo>(parseJSON<unknown>(text));
    return result.filter(r => r && typeof r.city === 'string' && Array.isArray(r.items) && r.items.length > 0);
  } catch {
    return [];
  }
}

// ─── Itinerary ────────────────────────────────────────────────────────────────

export async function generateItinerary(trip: Trip): Promise<ItineraryDay[]> {
  const days =
    Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1;

  const actId = logActivity({ message: `Generating ${days}-day itinerary for ${trip.destination}…`, status: 'pending' });

  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(trip.startDate + 'T12:00:00');
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const langInstruction = lang === 'fr' ? ' Generate all text content values in French, but keep JSON property names in English.' : '';

  // Must-dos only mode: when user specified explicit activities, use those as the sole source
  const mustDosBlock = trip.mustDos && trip.mustDos.length > 0
    ? trip.mustDos.map(({ city, items }) => `${city}:\n${items.map(i => `  - ${i}`).join('\n')}`).join('\n\n')
    : null;

  const contextLine = trip.notes ? `USER CONTEXT: ${trip.notes}\n\n` : '';

  const flightLine = trip.outboundFlight
    ? `OUTBOUND FLIGHT: Flight ${trip.outboundFlight.flightNumber}, departs ${trip.outboundFlight.departureAirport} at ${trip.outboundFlight.departureTime} on ${trip.outboundFlight.departureDate ?? dates[0]}, arrives ${trip.outboundFlight.arrivalAirport} at ${trip.outboundFlight.arrivalTime}. Add this as the first transport activity of Day 1.\n`
    : '';

  const stopsBlock = trip.plannedStops && trip.plannedStops.length > 0
    ? `PLANNED ROUTE (city by city — follow this structure exactly, correct obvious city name typos):\n${trip.plannedStops.map((s, i) => `  Stop ${i + 1}: ${s.city} — ${s.nights} night(s)`).join('\n')}\n`
    : '';

  const prompt = mustDosBlock
    ? `Create a ${days}-day itinerary for ${trip.destination}.
${contextLine}${flightLine}${stopsBlock}Dates: ${dates.map((d, i) => `Day ${i + 1}: ${d}`).join(', ')}.
Budget: ${trip.currency}${trip.budget} for ${trip.travelers} person(s).

INCLUDE ONLY THESE USER-SPECIFIED MUST-DO ACTIVITIES — nothing else:
${mustDosBlock}

STRICT RULES:
- Schedule EXACTLY the activities listed above, assigned to the appropriate city and day
- You MAY add transport (train, bus, car, flight) and accommodation check-in/check-out between must-dos
- Do NOT add restaurants, sightseeing, or any activity not listed above
- Distribute activities logically across days based on the city breakdown in context
- Each day title format: "Jour N — City: Theme" (or "Day N — City: Theme" in English)
- Correct any obvious city name typos (e.g. "Sapare" → "Sapa", "Barcelone" → "Barcelona")

Return a JSON array of exactly ${days} objects. Each object:
{"id":"day-N","date":"YYYY-MM-DD","location":"City name","title":"Day N — City: Theme","activities":[
  {"id":"act-N-M","time":"HH:MM","title":"Name","description":"One sentence.","category":"sightseeing|activity|transport|accommodation","estimatedCost":0,"duration":"Xh","reminders":["item to bring or remember"],"lat":0.0000,"lng":0.0000}
]}
Include "duration" as a short string (e.g. "2h", "1h30", "30min"). Include "reminders" as an array of concise things to bring or not forget for this specific activity (empty array [] if nothing notable).`
    : `${contextLine}${flightLine}${stopsBlock}Create a day-by-day itinerary for a ${days}-day trip to ${trip.destination}.
Dates: ${dates.map((d, i) => `Day ${i + 1}: ${d}`).join(', ')}.
Budget: ${trip.currency}${trip.budget} for ${trip.travelers} person(s).

${stopsBlock ? 'Assign days to cities following the planned route above. ' : 'Assign each day to the correct city based on context. '}Include accurate GPS coordinates. Correct any obvious city name typos.

Return a JSON array of exactly ${days} objects. Each object:
{"id":"day-N","date":"YYYY-MM-DD","location":"City name","title":"Day N — City: Theme","activities":[
  {"id":"act-N-M","time":"HH:MM","title":"Name","description":"One sentence.","category":"food|sightseeing|activity|transport|accommodation|free","estimatedCost":0,"duration":"Xh","reminders":["item to bring or remember"],"lat":0.0000,"lng":0.0000}
]}
3–5 activities per day with realistic times. Include accurate GPS coordinates. Keep descriptions to 1 sentence.
For each activity include "duration" (e.g. "2h", "1h30") and "reminders" (array of things to bring or not forget — empty [] if none).`;

  try {
    const text = await callGeneration(
      prompt,
      `Respond with ONLY a valid JSON array — no markdown, no code fences, no explanation. Raw JSON array only.${langInstruction}`,
      undefined,
      { maxTokens: 8192 }
    );
    const result = asArray<ItineraryDay>(parseJSON<unknown>(text))
      .filter((day): day is ItineraryDay => day != null)
      .map((day, i) => {
        const d = new Date(trip.startDate + 'T12:00:00');
        d.setDate(d.getDate() + i);
        return {
          ...day,
          date: d.toISOString().split('T')[0],
          location: day.location ?? undefined,
          activities: Array.isArray(day.activities) ? day.activities : [],
        };
      });
    logActivity({
      message: `Itinerary ready — ${result.length} days, ${result.reduce((n, d) => n + d.activities.length, 0)} activities`,
      status: 'success',
    }, actId);
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    logActivity({ message: 'Failed to generate itinerary', detail: msg, status: 'error' }, actId);
    throw e;
  }
}

// ─── Packing List ─────────────────────────────────────────────────────────────

export async function generatePackingList(trip: Trip): Promise<PackingItem[]> {
  const days =
    Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1;

  const actId = logActivity({ message: `Generating packing list for ${trip.destination}…`, status: 'pending' });

  const notesLine = trip.notes ? `\nAdditional context: ${trip.notes}` : '';

  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const langInstruction = lang === 'fr'
    ? ' Generate item name values in French, but keep JSON property names in English. Keep category field values in English: Documents, Clothing, Toiletries, Electronics, Health & Safety, Activities, Miscellaneous.'
    : '';

  const prompt = `Packing list for ${days}-day trip to ${trip.destination}.
Activities: ${trip.interests.join(', ')}. Travelers: ${trip.travelers}.${notesLine}

Return a JSON array of exactly 25 items:
[{"id":"item-N","name":"Item","category":"Documents|Clothing|Toiletries|Electronics|Health & Safety|Activities|Miscellaneous","packed":false,"quantity":1,"essential":true}]
Mark passport, medications as essential:true. Others essential:false.`;

  try {
    const text = await callGeneration(
      prompt,
      `Respond with ONLY a valid JSON array — no markdown, no code fences, no explanation. Raw JSON array only.${langInstruction}`,
      undefined,
      { maxTokens: 3000 }
    );
    const result = asArray<PackingItem>(parseJSON<unknown>(text));
    logActivity({ message: `Packing list ready — ${result.length} items`, status: 'success' }, actId);
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    logActivity({ message: 'Failed to generate packing list', detail: msg, status: 'error' }, actId);
    throw e;
  }
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

export async function chatAboutTrip(
  userMessage: string,
  history: ApiMessage[],
  trip: Trip,
  attachments?: TripContextFile[]
): Promise<string> {
  const actId = logActivity({ message: 'AI assistant responding…', status: 'pending' });

  const notesLine = trip.notes ? `\nTrip notes: ${trip.notes}` : '';

  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const system = `You are a travel assistant for a trip to ${trip.destination} (${trip.startDate} → ${trip.endDate}).
${trip.travelers} traveler(s). Budget: ${trip.currency}${trip.budget}. Interests: ${trip.interests.join(', ')}.${notesLine}
Be concise and specific. 2-4 sentences per answer. Respond in ${lang === 'fr' ? 'French' : 'English'}.`;

  try {
    let result: string;

    if (attachments?.length) {
      const content = buildClaudeContent(userMessage, { files: attachments });
      const historyContext = history.length
        ? `Previous conversation:\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n`
        : '';
      const withHistory: ClaudeContentBlock[] = typeof content === 'string'
        ? [{ type: 'text', text: historyContext + content }]
        : [{ type: 'text', text: historyContext }, ...content];
      result = await callClaude(withHistory, system, { maxTokens: 1024 });
    } else {
      result = await callPerplexity(
        [...history, { role: 'user', content: userMessage }],
        system,
        { maxTokens: 1024 }
      );
    }

    logActivity({ message: 'AI assistant replied', status: 'success' }, actId);
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    logActivity({ message: 'AI chat error', detail: msg, status: 'error' }, actId);
    throw e;
  }
}

// ─── Travel Search ────────────────────────────────────────────────────────────

export async function searchTravel(query: string, trip: Trip): Promise<string> {
  const actId = logActivity({ message: 'Searching travel info…', status: 'pending' });

  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const system = `You are a real-time travel search assistant. The user is planning a trip to ${trip.destination} from ${trip.startDate} to ${trip.endDate} with ${trip.travelers} traveler(s), budget ${trip.currency}${trip.budget}. Provide up-to-date, specific answers using web search. Be concise but thorough. Use clear sections when listing multiple items. Respond in ${lang === 'fr' ? 'French' : 'English'}.`;

  try {
    const result = await callPerplexity(
      [{ role: 'user', content: query }],
      system,
      { maxTokens: 2048, model: PPLX_SEARCH_MODEL }
    );
    logActivity({ message: 'Search complete', status: 'success' }, actId);
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    logActivity({ message: 'Search failed', detail: msg, status: 'error' }, actId);
    throw e;
  }
}

// ─── Voice → Activity ─────────────────────────────────────────────────────────

export async function getVoiceSuggestion(transcript: string, trip: Trip): Promise<string> {
  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const itineraryText = trip.itinerary.map(d =>
    `${d.date} — ${d.title}: ${d.activities.map(a => `${a.time} ${a.title}`).join(', ')}`
  ).join('\n');

  const prompt = `Trip: ${trip.destination}, ${trip.startDate} → ${trip.endDate}, ${trip.travelers} traveler(s).
Current itinerary:
${itineraryText || 'No itinerary yet.'}

User voice request: "${transcript}"

Give specific, actionable suggestions to improve or complement the itinerary based on the user's request. Be concise (max 5 suggestions). Respond in ${lang === 'fr' ? 'French' : 'English'}.`;

  return callGeneration(
    prompt,
    `You are an expert travel advisor. Give practical itinerary improvement suggestions. Be specific and brief.`,
    undefined,
    { maxTokens: 600 }
  );
}

export type VoiceParseResult =
  | { dayDate: string; candidateDates?: never; activity: Partial<Activity> }
  | { dayDate?: never; candidateDates: string[]; activity: Partial<Activity> };

export async function parseVoiceActivity(
  transcript: string,
  trip: Trip,
): Promise<VoiceParseResult | null> {
  if (!transcript.trim()) return null;

  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const langInstruction = lang === 'fr'
    ? ' All title/description values in French.'
    : ' All title/description values in English.';

  const datesContext = trip.itinerary.length > 0
    ? trip.itinerary.map((d, i) => {
        const dateObj = new Date(d.date + 'T12:00:00');
        const weekday = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
        return `Day ${i + 1} (${d.date}, ${weekday}): ${d.location ?? d.title}`;
      }).join('\n')
    : `Trip from ${trip.startDate} to ${trip.endDate}`;

  const fallbackDate = trip.itinerary[0]?.date ?? trip.startDate;

  const prompt = `Trip to ${trip.destination} (${trip.startDate} → ${trip.endDate}).
Itinerary days:
${datesContext}

Voice input: "${transcript}"

Parse this voice statement into a structured calendar activity. Extract each piece of information into its dedicated field — do NOT put duration or reminders in description.

CATEGORY RULES:
- "vol", "flight", "avion", "départ" → category: transport
- "restaurant", "dîner", "déjeuner", "lunch", "dinner" → category: food
- "réservé", "réservation", "booked" → category: reservation
- "hôtel", "hébergement", "check-in", "check-out" → category: accommodation
- "visite", "musée", "monument", "temple", "pagode" → category: sightseeing
- Correct any place name typos (e.g. "Foucoque" → "Phố Cổ", "Sapare" → "Sapa")

FIELD EXTRACTION RULES (critical — each value goes in its own field):
- duration: extract any mention of how long the activity lasts. Examples: "deux heures" → "2h", "une heure trente" → "1h30", "toute la journée" → "journée entière". If no duration mentioned, omit.
- reminders: extract ALL items to bring, buy, prepare, or not forget. Examples: "bouteille de vin rosé" → ["bouteille de vin rosé"], "maillot de bain et serviette" → ["maillot de bain", "serviette"], "acheter de la crème solaire" → ["crème solaire"]. Each item is a short noun phrase. If no reminders mentioned, use [].
- description: ONLY a brief sentence about what the activity is. Do NOT include duration or reminders here.

DAY MATCHING RULES (critical):
- If the user mentions a specific date ("le 23", "June 23") or "jour 3" / "day 2" → resolve directly to dayDate
- If the user mentions only a weekday ("mardi", "Tuesday", "lundi") AND exactly ONE trip day has that weekday → use dayDate
- If the user mentions only a weekday AND MULTIPLE trip days share that weekday → return candidateDates (array of all matching YYYY-MM-DD), NOT dayDate
- If day is completely unclear → use dayDate: "${fallbackDate}"

Return ONLY one of these two JSON shapes (no markdown):
Shape A (day is certain): {"dayDate":"YYYY-MM-DD","activity":{"time":"HH:MM","title":"Name","description":"One sentence about the activity only.","category":"food|transport|sightseeing|activity|accommodation|free|reservation","estimatedCost":0,"duration":"Xh","reminders":["item1","item2"]}}
Shape B (weekday ambiguous): {"candidateDates":["YYYY-MM-DD","YYYY-MM-DD"],"activity":{"time":"HH:MM","title":"Name","description":"One sentence about the activity only.","category":"food|transport|sightseeing|activity|accommodation|free|reservation","estimatedCost":0,"duration":"Xh","reminders":["item1","item2"]}}`;

  try {
    const text = await callGeneration(
      prompt,
      `You are a travel assistant parsing voice commands into calendar events. Return ONLY valid JSON.${langInstruction}`,
      undefined,
      { maxTokens: 500 }
    );
    const result = parseJSON<{ dayDate?: string; candidateDates?: string[]; activity: Partial<Activity> }>(text);
    if (!result?.activity?.title) return null;

    const validDates = trip.itinerary.map(d => d.date);

    if (result.candidateDates && result.candidateDates.length > 1) {
      const valid = result.candidateDates.filter(d => validDates.includes(d));
      if (valid.length > 1) return { candidateDates: valid, activity: result.activity };
      if (valid.length === 1) return { dayDate: valid[0], activity: result.activity };
    }

    if (result.dayDate) {
      const snapped = validDates.includes(result.dayDate) ? result.dayDate : fallbackDate;
      return { dayDate: snapped, activity: result.activity };
    }

    return { dayDate: fallbackDate, activity: result.activity };
  } catch {
    return null;
  }
}
