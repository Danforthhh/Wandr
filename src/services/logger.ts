export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  category: string;   // e.g. 'ai.claude', 'ai.perplexity', 'parse', 'firestore'
  message: string;
  data?: unknown;
  timestamp: string;
}

const MAX_ENTRIES = 300;
let entries: LogEntry[] = [];

type LogListener = (entry: LogEntry) => void;
let listener: LogListener | null = null;

export function setLogListener(fn: LogListener | null) { listener = fn; }
export function getLogs(): LogEntry[] { return [...entries]; }
export function clearLogs() { entries = []; listener?.(null as unknown as LogEntry); }

function nanoid() { return Math.random().toString(36).slice(2, 9); }

function emit(level: LogLevel, category: string, message: string, data?: unknown) {
  const entry: LogEntry = {
    id: nanoid(), level, category, message,
    data: data !== undefined ? data : undefined,
    timestamp: new Date().toISOString(),
  };
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), entry];
  listener?.(entry);

  // Mirror to browser console for DevTools
  const args: unknown[] = [`[${category}] ${message}`, ...(data !== undefined ? [data] : [])];
  if (level === 'error') console.error(...args);
  else if (level === 'warn')  console.warn(...args);
  else if (level === 'debug') console.debug(...args);
  else                        console.log(...args);
}

export const logger = {
  debug: (cat: string, msg: string, data?: unknown) => emit('debug', cat, msg, data),
  info:  (cat: string, msg: string, data?: unknown) => emit('info',  cat, msg, data),
  warn:  (cat: string, msg: string, data?: unknown) => emit('warn',  cat, msg, data),
  error: (cat: string, msg: string, data?: unknown) => emit('error', cat, msg, data),
};
