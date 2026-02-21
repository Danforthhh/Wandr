import { useState } from 'react';
import { Loader2, Sparkles, Clock, MapPin, Utensils, Train, Bed, Star, Coffee } from 'lucide-react';
import { Trip, Activity } from '../types';

const CATEGORY_STYLE: Record<Activity['category'], { Icon: React.ElementType; cls: string }> = {
  accommodation: { Icon: Bed,      cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  transport:     { Icon: Train,    cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  food:          { Icon: Utensils, cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  activity:      { Icon: Star,     cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  sightseeing:   { Icon: MapPin,   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  free:          { Icon: Coffee,   cls: 'text-gray-400 bg-gray-500/10 border-gray-700' },
};

interface Props {
  trip: Trip;
  onGenerate: (trip: Trip) => Promise<Trip>;
}

export default function Itinerary({ trip, onGenerate }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      await onGenerate(trip);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (trip.itinerary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-5">
          <span className="text-3xl">🗺️</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-200 mb-2">No itinerary yet</h3>
        <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">
          AI will create a personalized day-by-day schedule based on your destination, interests, and travel dates.
        </p>
        {error && (
          <div className="mb-5 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 max-w-sm">
            {error}
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl font-medium transition"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'Generating itinerary…' : 'Generate Itinerary'}
        </button>
      </div>
    );
  }

  const day = trip.itinerary[selectedDay];
  const totalCost = day?.activities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0) ?? 0;

  return (
    <div className="flex gap-5">
      {/* ── Day sidebar ── */}
      <div className="w-24 shrink-0 space-y-1">
        {trip.itinerary.map((d, i) => {
          const date = new Date(d.date + 'T12:00:00');
          const selected = i === selectedDay;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDay(i)}
              className={`w-full text-center px-2 py-2.5 rounded-xl transition ${
                selected
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <p className="text-xs font-medium opacity-80">
                {date.toLocaleDateString('en', { weekday: 'short' })}
              </p>
              <p className="text-xl font-bold leading-tight">{date.getDate()}</p>
              <p className="text-xs opacity-60">
                {date.toLocaleDateString('en', { month: 'short' })}
              </p>
            </button>
          );
        })}
        <button
          onClick={handleGenerate}
          disabled={loading}
          title="Regenerate itinerary"
          className="w-full mt-1 p-2 text-xs text-gray-600 hover:text-gray-400 hover:bg-gray-800 rounded-xl transition flex items-center justify-center gap-1"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Regen
        </button>
      </div>

      {/* ── Day detail ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">{day.title}</h3>
            <p className="text-sm text-gray-400">
              {new Date(day.date + 'T12:00:00').toLocaleDateString('en', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          {totalCost > 0 && (
            <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-lg shrink-0 ml-3">
              ~${totalCost.toLocaleString()} est.
            </span>
          )}
        </div>

        <div className="space-y-3">
          {day.activities.map((act: Activity) => {
            const { Icon, cls } = CATEGORY_STYLE[act.category] ?? CATEGORY_STYLE.free;
            return (
              <div
                key={act.id}
                className="flex gap-3 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition"
              >
                <div className={`p-2 rounded-lg border shrink-0 ${cls}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 justify-between">
                    <h4 className="font-medium text-gray-200 truncate">{act.title}</h4>
                    <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {act.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">{act.description}</p>
                  {act.estimatedCost > 0 && (
                    <p className="text-xs text-gray-600 mt-1">~${act.estimatedCost} per person</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
