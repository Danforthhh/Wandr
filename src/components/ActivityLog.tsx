import { useState, useEffect, useRef } from 'react';
import { ActivityEntry, setActivityListener } from '../services/activityLog';
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, Activity, Trash2 } from 'lucide-react';

export default function ActivityLog() {
  const [entries, setEntries]     = useState<ActivityEntry[]>([]);
  const [expanded, setExpanded]   = useState(true);
  const [hasNew, setHasNew]       = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActivityListener((entry) => {
      setEntries(prev => {
        const idx = prev.findIndex(e => e.id === entry.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = entry;
          return updated;
        }
        return [...prev.slice(-49), entry]; // keep last 50
      });
      setHasNew(true);
      setTimeout(() => setHasNew(false), 2000);
    });
    return () => setActivityListener(null);
  }, []);

  useEffect(() => {
    if (expanded) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, expanded]);

  const pending = entries.filter(e => e.status === 'pending').length;
  const hasEntries = entries.length > 0;

  const statusIcon = (status: ActivityEntry['status']) => {
    if (status === 'pending') return <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />;
    if (status === 'success') return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  };

  const statusBg = (status: ActivityEntry['status']) => {
    if (status === 'pending') return 'border-l-indigo-500';
    if (status === 'success') return 'border-l-emerald-500';
    return 'border-l-red-500';
  };

  return (
    <div
      className={`fixed z-40 rounded-2xl border border-gray-700 shadow-2xl shadow-black/60 overflow-hidden transition-all duration-200
        bottom-[72px] left-3 right-3
        md:bottom-4 md:left-auto md:right-4 md:w-80 ${
        hasNew ? 'ring-1 ring-indigo-500/40' : ''
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 transition"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-gray-200">Activity</span>
          {pending > 0 && (
            <span className="flex items-center gap-1 text-xs text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              {pending} running
            </span>
          )}
          {!expanded && hasEntries && pending === 0 && (
            <span className="text-xs text-gray-500">{entries.length} events</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {expanded && hasEntries && (
            <span
              onClick={e => { e.stopPropagation(); setEntries([]); }}
              className="p-1 text-gray-600 hover:text-gray-400 rounded transition cursor-pointer"
              title="Clear log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Log entries */}
      {expanded && (
        <div className="bg-gray-950 max-h-64 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-600">
              No activity yet. Start by creating a trip or generating content.
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className={`px-4 py-2.5 border-l-2 ${statusBg(entry.status)}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{statusIcon(entry.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 leading-snug">{entry.message}</p>
                      {entry.detail && (
                        <p className="text-xs text-red-400 mt-0.5 leading-snug">{entry.detail}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date(entry.timestamp).toLocaleTimeString('en', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
