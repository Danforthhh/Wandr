import { Trip } from '../types';
import { Plus, MapPin, Calendar, Users, Settings, Plane, Compass } from 'lucide-react';

interface Props {
  trips: Trip[];
  onNewTrip: () => void;
  onSelectTrip: (trip: Trip) => void;
  onSettingsClick: () => void;
}

function TripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    planning: { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'Planning' },
    upcoming: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Upcoming' },
    completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Completed' },
  };
  const status = statusConfig[trip.status];

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 bg-gray-900"
    >
      {/* Cover */}
      <div className={`h-32 bg-gradient-to-br ${trip.coverGradient} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-3 left-4 text-4xl drop-shadow-lg">{trip.emoji}</div>
        <div className="absolute top-3 right-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-100 group-hover:text-white truncate leading-tight">
          {trip.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span className="text-sm text-gray-400 truncate">{trip.destination}</span>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {start.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {trip.travelers}
          </span>
          <span className="font-medium text-gray-400">{days}d</span>
        </div>
      </div>
    </button>
  );
}

export default function Dashboard({ trips, onNewTrip, onSelectTrip, onSettingsClick }: Props) {
  const upcoming = trips.filter(t => t.status !== 'completed');
  const completed = trips.filter(t => t.status === 'completed');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/20">
              <Plane className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">Wandr</span>
              <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">
                AI
              </span>
            </div>
          </div>
          <button
            onClick={onSettingsClick}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
            title="API Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-6 md:py-8">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Your Trips</h1>
            <p className="text-gray-400 mt-1">Plan and explore the world with AI</p>
          </div>
          <button
            onClick={onNewTrip}
            className="flex items-center gap-2 px-3 md:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition shadow-lg shadow-indigo-900/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Trip</span>
          </button>
        </div>

        {/* Empty state */}
        {trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mb-5">
              <Compass className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-200 mb-2">No trips yet</h2>
            <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">
              Create your first trip and let AI build a personalized itinerary, packing list, and travel guide.
            </p>
            <button
              onClick={onNewTrip}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Plan your first trip
            </button>
          </div>
        )}

        {/* Upcoming trips */}
        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Upcoming & Planning
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map(trip => (
                <TripCard key={trip.id} trip={trip} onClick={() => onSelectTrip(trip)} />
              ))}
            </div>
          </section>
        )}

        {/* Completed trips */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Completed
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
              {completed.map(trip => (
                <TripCard key={trip.id} trip={trip} onClick={() => onSelectTrip(trip)} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
