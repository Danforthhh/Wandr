import { Trip, ItineraryDay, PackingItem } from '../types';
import { logActivity } from './activityLog';

// ─── Perplexity ───────────────────────────────────────────────────────────────

const PPLX_URL   = 'https://api.perplexity.ai/chat/completions';
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

async function callClaude(
  userContent: string,
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
    throw new Error(err?.error?.message || `Claude API error ${res.status}`);
  }

  const data = await res.json() as { content: { type: string; text: string }[] };
  const block = data.content.find(b => b.type === 'text');
  if (!block) throw new Error('No text content in Claude response');
  return block.text;
}

// ─── Routing helper ───────────────────────────────────────────────────────────
// Prefers Claude Haiku for generation (cheaper, high quality), falls back to Perplexity

async function callGeneration(
  prompt: string,
  system: string,
  anthropicKey: string,
  perplexityKey: string,
  options: { maxTokens?: number } = {}
): Promise<string> {
  if (anthropicKey) {
    return callClaude(prompt, system, anthropicKey, options);
  }
  return callPerplexity(
    [{ role: 'user', content: prompt }],
    system,
    perplexityKey,
    options
  );
}

// ─── JSON parse helper ────────────────────────────────────────────────────────

function parseJSON<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const firstBrace   = raw.indexOf('{');
    const firstBracket = raw.indexOf('[');
    let start = -1, closeChar = '';

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace; closeChar = '}';
    } else if (firstBracket !== -1) {
      start = firstBracket; closeChar = ']';
    }

    if (start !== -1) {
      const end = raw.lastIndexOf(closeChar);
      if (end > start) {
        try { return JSON.parse(raw.slice(start, end + 1)) as T; }
        catch { /* fall through */ }
      }
    }
    throw new Error('AI returned an unexpected format. Please try again.');
  }
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
}): Promise<TripOverview> {
  const { destination, startDate, endDate, interests, budget, travelers, anthropicKey, perplexityKey } = params;

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
      'You are a travel expert. Output valid JSON only, no other text.',
      anthropicKey,
      perplexityKey,
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

  const prompt = `Create a ${days}-day itinerary for ${trip.destination}.
Dates: ${dates.join(', ')}. Interests: ${trip.interests.join(', ')}.
Budget: ${trip.currency}${trip.budget} for ${trip.travelers} person(s).

Return a JSON array of ${days} objects. Each object:
{"id":"day-N","date":"YYYY-MM-DD","title":"Day theme","activities":[
  {"id":"act-N-M","time":"HH:MM","title":"Name","description":"One sentence.","category":"food|sightseeing|activity|transport|accommodation|free","estimatedCost":0,"lat":0.0000,"lng":0.0000}
]}
Exactly 4 activities per day. Include accurate GPS coordinates (lat/lng) for each specific location. Keep descriptions to 1 sentence.`;

  try {
    const text = await callGeneration(
      prompt,
      'Output valid JSON array only. No preamble, no explanation.',
      anthropicKey,
      perplexityKey,
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

  const prompt = `Packing list for ${days}-day trip to ${trip.destination}.
Activities: ${trip.interests.join(', ')}. Travelers: ${trip.travelers}.

Return a JSON array of exactly 25 items:
[{"id":"item-N","name":"Item","category":"Documents|Clothing|Toiletries|Electronics|Health & Safety|Activities|Miscellaneous","packed":false,"quantity":1,"essential":true}]
Mark passport, medications as essential:true. Others essential:false.`;

  try {
    const text = await callGeneration(
      prompt,
      'Output valid JSON array only.',
      anthropicKey,
      perplexityKey,
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

  const system = `You are a travel assistant for a trip to ${trip.destination} (${trip.startDate} → ${trip.endDate}).
${trip.travelers} traveler(s). Budget: ${trip.currency}${trip.budget}. Interests: ${trip.interests.join(', ')}.
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
