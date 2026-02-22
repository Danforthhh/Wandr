import { useState } from 'react';
import { Search, Loader2, Lock, Settings } from 'lucide-react';
import { Trip } from '../types';
import { searchTravel } from '../services/ai';

interface Props {
  trip: Trip;
  perplexityKey: string;
  hasSearchKey: boolean;
  onSettingsClick: () => void;
}

const PRESETS = [
  { label: '⛅ Weather',      query: 'Current weather forecast and what to pack' },
  { label: '✈️ Flights',      query: 'Current flight prices and booking recommendations' },
  { label: '🏨 Hotels',       query: 'Best hotels and accommodation options with current prices' },
  { label: '🎫 Events',       query: 'Events, festivals and activities happening during my trip' },
  { label: '🍴 Restaurants',  query: 'Best local restaurants and must-try dishes' },
  { label: '💡 Travel Tips',  query: 'Essential travel tips, visa requirements and local customs' },
];

export default function TripSearch({ trip, perplexityKey, hasSearchKey, onSettingsClick }: Props) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const runSearch = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult('');
    setActiveQuery(q);
    try {
      const res = await searchTravel(q, trip, perplexityKey);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Locked state ─────────────────────────────────────────────────────────────
  if (!hasSearchKey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center mb-5">
          <Lock className="w-7 h-7 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">Travel Search unavailable</h3>
        <p className="text-gray-600 max-w-sm mb-6 leading-relaxed text-sm">
          Add your Perplexity API key to search real-time travel info — flights, hotels, weather,
          events, and more for {trip.destination}.
        </p>
        <button
          onClick={onSettingsClick}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition"
        >
          <Settings className="w-4 h-4" />
          Set up in Settings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-200 mb-1">Live Travel Search</h3>
        <p className="text-sm text-gray-500">
          Real-time info for <span className="text-gray-300">{trip.destination}</span> — powered by Perplexity Sonar
        </p>
      </div>

      {/* Preset quick searches */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => { setQuery(p.query); runSearch(p.query); }}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition disabled:opacity-50 ${
              activeQuery === p.query && (loading || result)
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom query input */}
      <form
        onSubmit={e => { e.preventDefault(); runSearch(query); }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search anything about ${trip.destination}…`}
          disabled={loading}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50 text-sm"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition shrink-0"
        >
          {loading
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Search className="w-5 h-5" />
          }
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm text-gray-500">Searching the web for real-time info…</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800">
            <div className="w-6 h-6 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-gray-300">Results</span>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-auto">
              Live
            </span>
          </div>
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
