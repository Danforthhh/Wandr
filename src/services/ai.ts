import { Trip, ItineraryDay, PackingItem, TripContext } from '../types';
import { logActivity } from './activityLog';

// ─── Perplexity ───────────────────────────────────────────────────────────────

const PPLX_URL         = 'https://api.perplexity.ai/chat/completions';
const PPLX_MODEL        = 'sonar-pro';
const PPLX_SEARCH_MODEL = 'sonar';

type ApiMessage  = { role: 'user' | 'assistant'; content: string };
type FullMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function callPerplexity(
  messages: ApiMessage[],
  system: string,
  apiKey: string,
  options: { maxTokens?: number; model?: string } = {}
): Promise<string> {
  const { maxTokens = 8192, model = PPLX_MODEL } = options;
  const allMessages: FullMessage[] = [{ role: 'system', content: system }, ...messages];

  const res = await fetch(PPLX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: allMessages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `Perplexity API error ${res.status}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

// ─── Claude ───────────────────────────────────────────────────────────────────

const CLAUDE_URL   = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

async function callClaude(
  userContent: string | ClaudeContentBlock[],
  system: string,
  apiKey: string,
  options: { maxTokens?: number } = {}
): Promise<string> {
  const { maxTokens = 8192 } = options;

  const res = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
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
    if (res.status === 401 || raw.toLowerCase().includes('api-key') || raw.toLowerCase().includes('authentication')) {
      throw new Error('Invalid Claude API key — please check your Anthropic key in Settings.');
    }
    throw new Error(raw);
  }

  const data = await res.json() as { content: { type: string; text: string }[] };
  const block = data.content.find(b => b.type === 'text');
  if (!block) throw new Error('No text content in Claude response');
  return block.text;
}

// ─── Context → Claude content blocks ─────────────────────────────────────────

function buildClaudeContent(prompt: string, context?: TripContext): string | ClaudeContentBlock[] {
  if (!context?.text && !context?.files?.length) return prompt;

  const files     = context.files ?? [];
  const imgFiles  = files.filter(f => f.mimeType.startsWith('image/'));
  const pdfFiles  = files.filter(f => f.mimeType === 'application/pdf');
  const txtFiles  = files.filter(f => f.mimeType === 'text/plain' || f.mimeType === 'text/markdown');

  // No binary files → return enriched text
  if (!imgFiles.length && !pdfFiles.length) {
    let enriched = '';
    if (context.text) enriched += `User notes: ${context.text}\n\n`;
    for (const f of txtFiles) {
      try { enriched += `--- ${f.name} ---\n${atob(f.dataBase64)}\n\n`; } catch { /* skip */ }
    }
    return enriched + prompt;
  }

  // Build multimodal array
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

// ─── Routing helper ───────────────────────────────────────────────────────────

async function callGeneration(
  prompt: string,
  system: string,
  anthropicKey: string,
  perplexityKey: string,
  context?: TripContext,
  options: { maxTokens?: number } = {}
): Promise<string> {
  if (anthropicKey) {
    try {
      const content = buildClaudeContent(prompt, context);
      return await callClaude(content, system, anthropicKey, options);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const isAuthError = msg.includes('Invalid Claude API key') || msg.includes('401');
      // Fall back to Perplexity on auth errors only (if available)
      if (!isAuthError || !perplexityKey) throw e;
      logActivity({ message: 'Claude key invalid — using Perplexity', status: 'pending' });
    }
  }
  // Perplexity: text notes + text files only (images/PDFs silently dropped)
  let enriched = prompt;
  if (context?.text) enriched = `User notes: ${context.text}\n\n${prompt}`;
  const txtFiles = (context?.files ?? []).filter(
    f => f.mimeType === 'text/plain' || f.mimeType === 'text/markdown'
  );
  if (txtFiles.length) {
    let extra = '';
    for (const f of txtFiles) {
      try { extra += `--- ${f.name} ---\n${atob(f.dataBase64)}\n\n`; } catch { /* skip */ }
    }
    enriched = extra + enriched;
  }
  return callPerplexity([{ role: 'user', content: enriched }], system, perplexityKey, options);
}

// ─── JSON parse helper ────────────────────────────────────────────────────────

// Walk a string to find the closing bracket/brace that matches the opener at `start`.
// Respects string literals and escape sequences so citation markers like [1] are ignored.
function extractBalanced(text: string, start: number, open: string, close: string): string | null {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') { i++; continue; } // skip escaped char
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === open)  { depth++; continue; }
    if (ch === close) { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

function parseJSON<T>(raw: string): T {
  // Strip markdown code fences that Perplexity/Claude sometimes add
  const stripped = raw
    .replace(/^```(?:json|JSON)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();

  // Try candidates in order: stripped, original
  for (const candidate of [stripped, raw]) {
    // 1. Direct parse
    try { return JSON.parse(candidate) as T; } catch { /* try next strategy */ }

    // 2. Extract outermost JSON object or array using balanced-bracket walk
    //    (avoids being fooled by Perplexity citation markers like [1] after the JSON)
    for (const [open, close] of [['{', '}'], ['[', ']']] as const) {
      const start = candidate.indexOf(open);
      if (start === -1) continue;
      const extracted = extractBalanced(candidate, start, open, close);
      if (!extracted) continue;
      try { return JSON.parse(extracted) as T; } catch { /* try next */ }
    }
  }

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
  anthropicKey: string;
  perplexityKey: string;
  context?: TripContext;
}): Promise<TripOverview> {
  const { destination, startDate, endDate, interests, budget, travelers,
          anthropicKey, perplexityKey, context } = params;

  logActivity({ message: `Creating trip to ${destination}…`, status: 'pending' });

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
      'You are a travel expert. Respond with ONLY a valid JSON object — no markdown, no code fences, no explanation, no citations. Raw JSON only.',
      anthropicKey,
      perplexityKey,
      context,
      { maxTokens: 512 }
    );
    const result = parseJSON<TripOverview>(text);
    logActivity({ message: `Trip "${result.name}" created`, status: 'success' });
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    logActivity({ message: 'Failed to create trip', detail: msg, status: 'error' });
    throw e;
  }
}

// ─── Itinerary ────────────────────────────────────────────────────────────────

export async function generateItinerary(
  trip: Trip,
  anthropicKey: string,
  perplexityKey: string
): Promise<ItineraryDay[]> {
  const days =
    Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1;

  logActivity({ message: `Generating ${days}-day itinerary for ${trip.destination}…`, status: 'pending' });

  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(trip.startDate + 'T12:00:00');
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const notesLine = trip.notes ? `\nAdditional context: ${trip.notes}` : '';

  const prompt = `Create a ${days}-day itinerary for ${trip.destination}.
Dates: ${dates.join(', ')}. Interests: ${trip.interests.join(', ')}.
Budget: ${trip.currency}${trip.budget} for ${trip.travelers} person(s).${notesLine}

Return a JSON array of ${days} objects. Each object:
{"id":"day-N","date":"YYYY-MM-DD","title":"Day theme","activities":[
  {"id":"act-N-M","time":"HH:MM","title":"Name","description":"One sentence.","category":"food|sightseeing|activity|transport|accommodation|free","estimatedCost":0,"lat":0.0000,"lng":0.0000}
]}
Exactly 4 activities per day. Include accurate GPS coordinates (lat/lng) for each specific location. Keep descriptions to 1 sentence.`;

  try {
    const text = await callGeneration(
      prompt,
      'Respond with ONLY a valid JSON array — no markdown, no code fences, no explanation, no citations. Raw JSON array only.',
      anthropicKey,
      perplexityKey,
      undefined,
      { maxTokens: 8192 }
    );
    const result = parseJSON<ItineraryDay[]>(text);
    logActivity({
      message: `Itinerary ready — ${result.length} days, ${result.reduce((n, d) => n + d.activities.length, 0)} activities`,
      status: 'success',
    });
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    logActivity({ message: 'Failed to generate itinerary', detail: msg, status: 'error' });
    throw e;
  }
}

// ─── Packing List ─────────────────────────────────────────────────────────────

export async function generatePackingList(
  trip: Trip,
  anthropicKey: string,
  perplexityKey: string
): Promise<PackingItem[]> {
  const days =
    Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1;

  logActivity({ message: `Generating packing list for ${trip.destination}…`, status: 'pending' });

  const notesLine = trip.notes ? `\nAdditional context: ${trip.notes}` : '';

  const prompt = `Packing list for ${days}-day trip to ${trip.destination}.
Activities: ${trip.interests.join(', ')}. Travelers: ${trip.travelers}.${notesLine}

Return a JSON array of exactly 25 items:
[{"id":"item-N","name":"Item","category":"Documents|Clothing|Toiletries|Electronics|Health & Safety|Activities|Miscellaneous","packed":false,"quantity":1,"essential":true}]
Mark passport, medications as essential:true. Others essential:false.`;

  try {
    const text = await callGeneration(
      prompt,
      'Respond with ONLY a valid JSON array — no markdown, no code fences, no explanation, no citations. Raw JSON array only.',
      anthropicKey,
      perplexityKey,
      undefined,
      { maxTokens: 3000 }
    );
    const result = parseJSON<PackingItem[]>(text);
    logActivity({ message: `Packing list ready — ${result.length} items`, status: 'success' });
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    logActivity({ message: 'Failed to generate packing list', detail: msg, status: 'error' });
    throw e;
  }
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

export async function chatAboutTrip(
  userMessage: string,
  history: ApiMessage[],
  trip: Trip,
  perplexityKey: string
): Promise<string> {
  logActivity({ message: 'AI assistant responding…', status: 'pending' });

  const notesLine = trip.notes ? `\nTrip notes: ${trip.notes}` : '';

  const system = `You are a travel assistant for a trip to ${trip.destination} (${trip.startDate} → ${trip.endDate}).
${trip.travelers} traveler(s). Budget: ${trip.currency}${trip.budget}. Interests: ${trip.interests.join(', ')}.${notesLine}
Be concise and specific. 2-4 sentences per answer.`;

  try {
    const result = await callPerplexity(
      [...history, { role: 'user', content: userMessage }],
      system,
      perplexityKey,
      { maxTokens: 1024 }
    );
    logActivity({ message: 'AI assistant replied', status: 'success' });
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    logActivity({ message: 'AI chat error', detail: msg, status: 'error' });
    throw e;
  }
}

// ─── Travel Search (Perplexity Sonar — real-time web) ────────────────────────

export async function searchTravel(
  query: string,
  trip: Trip,
  perplexityKey: string
): Promise<string> {
  logActivity({ message: 'Searching travel info…', status: 'pending' });

  const system = `You are a real-time travel search assistant. The user is planning a trip to ${trip.destination} from ${trip.startDate} to ${trip.endDate} with ${trip.travelers} traveler(s), budget ${trip.currency}${trip.budget}. Provide up-to-date, specific answers using web search. Be concise but thorough. Use clear sections when listing multiple items.`;

  try {
    const result = await callPerplexity(
      [{ role: 'user', content: query }],
      system,
      perplexityKey,
      { maxTokens: 2048, model: PPLX_SEARCH_MODEL }
    );
    logActivity({ message: 'Search complete', status: 'success' });
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    logActivity({ message: 'Search failed', detail: msg, status: 'error' });
    throw e;
  }
}
