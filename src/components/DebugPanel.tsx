import { useState, useEffect, useRef } from 'react';
import { X, Copy, Trash2, ChevronDown, ChevronRight, Bug } from 'lucide-react';
import { LogEntry, LogLevel, getLogs, clearLogs, setLogListener } from '../services/logger';

const LEVEL_STYLE: Record<LogLevel, string> = {
  debug: 'text-gray-400',
  info:  'text-blue-300',
  warn:  'text-amber-300',
  error: 'text-red-400',
};

const LEVEL_BG: Record<LogLevel, string> = {
  debug: 'bg-gray-800',
  info:  'bg-blue-500/10 border-l-blue-500',
  warn:  'bg-amber-500/10 border-l-amber-500',
  error: 'bg-red-500/10 border-l-red-500',
};

function DataTree({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  if (data === undefined || data === null) return null;
  const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const isLong = str.length > 120;
  return (
    <div className="mt-1">
      {isLong ? (
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition">
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {open ? 'Collapse' : `Expand (${str.length} chars)`}
        </button>
      ) : null}
      {(!isLong || open) && (
        <pre className="text-[10px] text-gray-400 bg-gray-900 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
          {str}
        </pre>
      )}
    </div>
  );
}

export default function DebugPanel() {
  const [open, setOpen]         = useState(false);
  const [entries, setEntries]   = useState<LogEntry[]>(() => getLogs());
  const [filter, setFilter]     = useState<LogLevel | 'all'>('all');
  const [search, setSearch]     = useState('');
  const [copied, setCopied]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Toggle on Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Subscribe to new log entries
  useEffect(() => {
    setLogListener((entry) => {
      if (!entry) { setEntries([]); return; }   // clearLogs() sends null
      setEntries(getLogs());
    });
    return () => setLogListener(null);
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, open]);

  const visible = entries.filter(e =>
    (filter === 'all' || e.level === filter) &&
    (!search || e.message.toLowerCase().includes(search.toLowerCase()) ||
     e.category.toLowerCase().includes(search.toLowerCase()))
  );

  const copyAll = () => {
    const text = visible.map(e =>
      `[${e.timestamp}] [${e.level.toUpperCase()}] [${e.category}] ${e.message}` +
      (e.data !== undefined ? '\n' + JSON.stringify(e.data, null, 2) : '')
    ).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Debug panel (Ctrl+Shift+D)"
        className="fixed bottom-4 left-4 z-50 w-8 h-8 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 hover:border-gray-500 transition shadow-lg"
      >
        <Bug className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-2 bottom-2 top-2 z-50 md:inset-x-auto md:left-auto md:right-2 md:top-2 md:bottom-2 md:w-[560px] flex flex-col bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 shrink-0">
        <Bug className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="font-medium text-sm text-gray-200">Debug Log</span>
        <span className="text-xs text-gray-600 ml-1">{entries.length} entries</span>

        {/* Level filter */}
        <div className="flex gap-1 ml-2">
          {(['all', 'debug', 'info', 'warn', 'error'] as const).map(l => (
            <button
              key={l}
              onClick={() => setFilter(l)}
              className={`text-xs px-2 py-0.5 rounded-full transition ${
                filter === l
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={copyAll} title="Copy all visible logs" className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition text-xs flex items-center gap-1">
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={() => { clearLogs(); setEntries([]); }} title="Clear" className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setOpen(false)} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter messages or categories…"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto text-xs font-mono">
        {visible.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-gray-600">No entries</div>
        ) : (
          visible.map(entry => (
            <div key={entry.id} className={`px-3 py-2 border-b border-gray-800/60 border-l-2 ${LEVEL_BG[entry.level]}`}>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-gray-600 shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  <span className="text-gray-700">
                    .{String(new Date(entry.timestamp).getMilliseconds()).padStart(3, '0')}
                  </span>
                </span>
                <span className={`uppercase font-bold shrink-0 ${LEVEL_STYLE[entry.level]}`}>{entry.level}</span>
                <span className="text-indigo-400 shrink-0">{entry.category}</span>
                <span className="text-gray-300 break-all">{entry.message}</span>
              </div>
              {entry.data !== undefined && <DataTree data={entry.data} />}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-2 border-t border-gray-800 text-[10px] text-gray-600 shrink-0">
        Ctrl+Shift+D to toggle · {visible.length} of {entries.length} shown
      </div>
    </div>
  );
}
