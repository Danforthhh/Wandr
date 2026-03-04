import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  parseJSON,
  extractBalanced,
  asArray,
  buildClaudeContent,
  generateTripDetails,
} from '../../services/ai';
import { clearLogs } from '../../services/logger';

beforeEach(() => clearLogs());
afterEach(() => vi.clearAllMocks());

// ── extractBalanced ───────────────────────────────────────────────────────────

describe('extractBalanced', () => {
  it('extracts a simple object', () => {
    const result = extractBalanced('{"a":1}', 0, '{', '}');
    expect(result).toBe('{"a":1}');
  });

  it('extracts a nested object', () => {
    const result = extractBalanced('{"a":{"b":2}}', 0, '{', '}');
    expect(result).toBe('{"a":{"b":2}}');
  });

  it('handles leading text before the opening bracket', () => {
    const text = 'some text {"key":"val"} more text';
    const idx = text.indexOf('{');
    const result = extractBalanced(text, idx, '{', '}');
    expect(result).toBe('{"key":"val"}');
  });

  it('extracts a JSON array', () => {
    const result = extractBalanced('[1,2,3]', 0, '[', ']');
    expect(result).toBe('[1,2,3]');
  });

  it('ignores brackets inside string literals', () => {
    const result = extractBalanced('{"key":"a{b}c"}', 0, '{', '}');
    expect(result).toBe('{"key":"a{b}c"}');
  });

  it('returns null when there is no matching close bracket', () => {
    const result = extractBalanced('{"unclosed":1', 0, '{', '}');
    expect(result).toBeNull();
  });

  it('handles escaped quotes inside strings', () => {
    const result = extractBalanced('{"key":"he said \\"hi\\""}', 0, '{', '}');
    expect(result).toBe('{"key":"he said \\"hi\\""}');
  });
});

// ── parseJSON ─────────────────────────────────────────────────────────────────

describe('parseJSON', () => {
  it('parses a plain JSON object', () => {
    const result = parseJSON<{ name: string }>('{"name":"Paris"}');
    expect(result.name).toBe('Paris');
  });

  it('strips markdown code fences (```json … ```)', () => {
    const raw = '```json\n{"name":"Tokyo"}\n```';
    const result = parseJSON<{ name: string }>(raw);
    expect(result.name).toBe('Tokyo');
  });

  it('strips plain ``` fences', () => {
    const raw = '```\n{"name":"Rome"}\n```';
    expect(parseJSON<{ name: string }>(raw).name).toBe('Rome');
  });

  it('extracts JSON embedded in surrounding prose', () => {
    const raw = 'Here is your plan:\n{"name":"London"}\nHope you enjoy!';
    expect(parseJSON<{ name: string }>(raw).name).toBe('London');
  });

  it('parses a JSON array directly', () => {
    const result = parseJSON<number[]>('[1,2,3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('prefers the array when an array appears before an object', () => {
    const raw = '[{"id":1}]';
    const result = parseJSON<{ id: number }[]>(raw);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(1);
  });

  it('throws on completely unparseable input', () => {
    expect(() => parseJSON('not json at all')).toThrow();
  });

  it('handles citation markers that appear AFTER the main JSON object', () => {
    // [n] citation markers before JSON are themselves valid JSON arrays and
    // are extracted first. Markers appearing only after JSON are safely ignored.
    const raw = '{"city":"Berlin"} Sources: [1], [2].';
    expect(parseJSON<{ city: string }>(raw).city).toBe('Berlin');
  });
});

// ── asArray ───────────────────────────────────────────────────────────────────

describe('asArray', () => {
  it('returns a direct array as-is', () => {
    expect(asArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('unwraps {"itinerary": [...]}', () => {
    expect(asArray({ itinerary: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('unwraps {"days": [...]}', () => {
    expect(asArray({ days: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  it('unwraps any single-array-value object', () => {
    expect(asArray({ items: [10, 20] })).toEqual([10, 20]);
  });

  it('throws on a plain object with no array values', () => {
    expect(() => asArray({ foo: 'bar' })).toThrow();
  });

  it('throws on null', () => {
    expect(() => asArray(null)).toThrow();
  });

  it('throws on a string', () => {
    expect(() => asArray('hello')).toThrow();
  });
});

// ── buildClaudeContent ────────────────────────────────────────────────────────

describe('buildClaudeContent', () => {
  it('returns a plain string when no context', () => {
    const result = buildClaudeContent('plan my trip');
    expect(typeof result).toBe('string');
    expect(result).toBe('plan my trip');
  });

  it('prepends text context to the prompt', () => {
    const result = buildClaudeContent('plan', { text: 'I love hiking' });
    expect(typeof result).toBe('string');
    expect(result as string).toContain('I love hiking');
    expect(result as string).toContain('plan');
  });

  it('inlines plain text files', () => {
    const file = {
      id: '1', name: 'notes.txt', mimeType: 'text/plain',
      dataBase64: btoa('buy sunscreen'), size: 13,
    };
    const result = buildClaudeContent('trip', { files: [file] });
    expect(typeof result).toBe('string');
    expect(result as string).toContain('buy sunscreen');
  });

  it('returns a content block array for image files', () => {
    const file = {
      id: '1', name: 'photo.jpg', mimeType: 'image/jpeg',
      dataBase64: 'abc123', size: 100,
    };
    const result = buildClaudeContent('describe', { files: [file] });
    expect(Array.isArray(result)).toBe(true);
    const blocks = result as { type: string }[];
    expect(blocks.some(b => b.type === 'image')).toBe(true);
  });

  it('returns a content block array for PDF files', () => {
    const file = {
      id: '1', name: 'doc.pdf', mimeType: 'application/pdf',
      dataBase64: 'abc123', size: 100,
    };
    const result = buildClaudeContent('summarize', { files: [file] });
    expect(Array.isArray(result)).toBe(true);
    const blocks = result as { type: string }[];
    expect(blocks.some(b => b.type === 'document')).toBe(true);
  });
});

// ── generateTripDetails (network) ─────────────────────────────────────────────

describe('generateTripDetails', () => {
  const BASE_PARAMS = {
    destination: 'Kyoto',
    startDate: '2026-05-01',
    endDate: '2026-05-07',
    interests: ['temples', 'food'],
    budget: 2000,
    travelers: 2,
    anthropicKey: 'test-key',
  };

  it('returns a parsed TripOverview on success', async () => {
    const mockResponse = JSON.stringify({
      name: 'Kyoto Zen Journey',
      emoji: '⛩️',
      description: 'A serene week exploring ancient temples and cuisine.',
      coverGradient: 'from-violet-900 to-indigo-900',
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: mockResponse }],
      }),
    }));

    const result = await generateTripDetails(BASE_PARAMS);
    expect(result.name).toBe('Kyoto Zen Journey');
    expect(result.emoji).toBe('⛩️');
    vi.unstubAllGlobals();
  });

  it('throws a friendly error on 401 (bad API key)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key.' } }),
    }));

    await expect(generateTripDetails(BASE_PARAMS)).rejects.toThrow(/Invalid Claude API key/);
    vi.unstubAllGlobals();
  });

  it('throws when no anthropicKey provided', async () => {
    await expect(generateTripDetails({ ...BASE_PARAMS, anthropicKey: '' }))
      .rejects.toThrow(/Anthropic.*API key/i);
  });

  it('handles Claude returning JSON wrapped in markdown fences', async () => {
    const mockResponse = '```json\n{"name":"Test Trip","emoji":"✈️","description":"Desc.","coverGradient":"from-blue-900 to-cyan-900"}\n```';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: mockResponse }],
      }),
    }));

    const result = await generateTripDetails(BASE_PARAMS);
    expect(result.name).toBe('Test Trip');
    vi.unstubAllGlobals();
  });
});
