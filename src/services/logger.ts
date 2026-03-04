export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  category: string;   // e.g. 'ai.claude', 'ai.perplexity', 'parse', 'firestore'
  message: string;
  data?: unknown;
  timestamp: string;
  /** Elapsed ms — set when entry was created via logger.timeEnd() */
  elapsed?: number;
}

const MAX_ENTRIES = 300;
const STORAGE_KEY = 'wandr_debug_logs';

let entries: LogEntry[] = [];
let persistEnabled = false;

type LogListener = (entry: LogEntry) => void;
const listeners = new Set<LogListener>();

// ─── Persistence ──────────────────────────────────────────────────────────────

export function isPersistEnabled(): boolean { return persistEnabled; }

export function setPersist(enabled: boolean): void {
  persistEnabled = enabled;
  if (enabled) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* quota */ }
  } else {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
}

export function loadPersistedLogs(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as LogEntry[];
    if (Array.isArray(saved)) {
      entries = saved.slice(-MAX_ENTRIES);
      listeners.forEach(fn => fn({ id: '__reload__', level: 'debug', category: 'logger', message: 'Persisted logs loaded', timestamp: new Date().toISOString() }));
    }
  } catch { /* corrupt storage — ignore */ }
}

// ─── Core ─────────────────────────────────────────────────────────────────────

function nanoid() { return Math.random().toString(36).slice(2, 9); }

export function setLogListener(fn: LogListener | null) {
  if (fn) listeners.add(fn);
}
export function removeLogListener(fn: LogListener) { listeners.delete(fn); }
export function getLogs(): LogEntry[] { return [...entries]; }
export function clearLogs() {
  entries = [];
  if (persistEnabled) {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
  // Broadcast a clear sentinel so subscribers can reset their state
  listeners.forEach(fn => fn(null as unknown as LogEntry));
}

function emit(level: LogLevel, category: string, message: string, data?: unknown, elapsed?: number) {
  const entry: LogEntry = {
    id: nanoid(), level, category, message,
    data: data !== undefined ? data : undefined,
    timestamp: new Date().toISOString(),
    ...(elapsed !== undefined ? { elapsed } : {}),
  };
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), entry];

  if (persistEnabled) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* quota */ }
  }

  listeners.forEach(fn => fn(entry));

  // Mirror to browser console
  const args: unknown[] = [`[${category}] ${message}`, ...(data !== undefined ? [data] : [])];
  if (elapsed !== undefined) args.push(`(${elapsed.toFixed(1)}ms)`);
  if (level === 'error') console.error(...args);
  else if (level === 'warn')  console.warn(...args);
  else if (level === 'debug') console.debug(...args);
  else                        console.log(...args);
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportLogs(format: 'json' | 'text' = 'text'): string {
  if (format === 'json') return JSON.stringify(entries, null, 2);
  return entries.map(e =>
    `[${e.timestamp}] [${e.level.toUpperCase()}] [${e.category}]${e.elapsed !== undefined ? ` (${e.elapsed.toFixed(1)}ms)` : ''} ${e.message}` +
    (e.data !== undefined ? '\n' + JSON.stringify(e.data, null, 2) : '')
  ).join('\n\n');
}

export function downloadLogs(format: 'json' | 'text' = 'text'): void {
  const content = exportLogs(format);
  const mime = format === 'json' ? 'application/json' : 'text/plain';
  const ext  = format === 'json' ? 'json' : 'txt';
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `wandr-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Performance timing ───────────────────────────────────────────────────────

const timers = new Map<string, number>();

function timeStart(label: string): void {
  timers.set(label, performance.now());
}

function timeEnd(category: string, label: string, data?: unknown): void {
  const start = timers.get(label);
  if (start === undefined) {
    emit('warn', category, `timeEnd called without timeStart for "${label}"`);
    return;
  }
  const elapsed = performance.now() - start;
  timers.delete(label);
  emit('debug', category, label, data, elapsed);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  debug: (cat: string, msg: string, data?: unknown) => emit('debug', cat, msg, data),
  info:  (cat: string, msg: string, data?: unknown) => emit('info',  cat, msg, data),
  warn:  (cat: string, msg: string, data?: unknown) => emit('warn',  cat, msg, data),
  error: (cat: string, msg: string, data?: unknown) => emit('error', cat, msg, data),
  /** Start a named timer. */
  timeStart,
  /** End a named timer and emit a debug entry with elapsed ms. */
  timeEnd,
};
