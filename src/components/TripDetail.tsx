import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Trip, DetailTab, ChatMessage } from '../types';
import Itinerary from './Itinerary';
import PackingList from './PackingList';
import AIChat from './AIChat';

interface Props {
  trip: Trip;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onBack: () => void;
  onDelete: (id: string) => void;
  onGenerateItinerary: (trip: Trip) => Promise<Trip>;
  onGeneratePackingList: (trip: Trip) => Promise<Trip>;
  onUpdateTrip: (trip: Trip) => void;
  getChatHistory: (tripId: string) => ChatMessage[];
  saveChatHistory: (tripId: string, messages: ChatMessage[]) => void;
  apiKey: string;
}

const TABS: { id: DetailTab; label: string; emoji: string }[] = [
  { id: 'overview',  label: 'Overview',   emoji: '🏠' },
  { id: 'itinerary', label: 'Itinerary',  emoji: '🗺️' },
  { id: 'packing',   label: 'Packing',    emoji: '🧳' },
  { id: 'chat',      label: 'AI Chat',    emoji: '💬' },
];

const STATUS_CYCLE: Record<Trip['status'], Trip['status']> = {
  planning: 'upcoming',
  upcoming: 'completed',
  completed: 'planning',
};

const STATUS_STYLE: Record<Trip['status'], string> = {
  planning:  'bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30',
  upcoming:  'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30',
  completed: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30',
};

export default function TripDetail({
  trip,
  activeTab,
  onTabChange,
  onBack,
  onDelete,
  onGenerateItinerary,
  onGeneratePackingList,
  onUpdateTrip,
  getChatHistory,
  saveChatHistory,
  apiKey,
}: Props) {
  const start = new Date(trip.startDate + 'T12:00:00');
  const end   = new Date(trip.endDate   + 'T12:00:00');
  const days  = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;

  const handleDelete = () => {
    if (confirm(`Delete "${trip.name}"? This cannot be undone.`)) onDelete(trip.id);
  };

  const cycleStatus = () => {
    onUpdateTrip({ ...trip, status: STATUS_CYCLE[trip.status] });
  };

  const activityCount = trip.itinerary.reduce((n, d) => n + d.activities.length, 0);
  const packedCount   = trip.packingList.filter(i => i.packed).length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* ── Cover / hero ── */}
      <div className={`bg-gradient-to-br ${trip.coverGradient} relative`}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />

        {/* Top bar */}
        <div className="relative max-w-5xl mx-auto px-6 pt-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={cycleStatus}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition ${STATUS_STYLE[trip.status]}`}
              title="Click to advance status"
            >
              <RefreshCw className="w-3 h-3 inline mr-1" />
              {trip.status}
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-white/40 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition"
              title="Delete trip"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trip info */}
        <div className="relative max-w-5xl mx-auto px-6 pt-4 pb-5">
          <div className="flex items-start gap-4">
            <span className="text-5xl drop-shadow-lg shrink-0">{trip.emoji}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white leading-tight">{trip.name}</h1>
              <div className="flex items-center gap-1.5 mt-1 text-white/70">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="text-sm">{trip.destination}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-white/60">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {start.toLocaleDateString('en', { month: 'short', day: 'numeric' })} –{' '}
                  {end.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  <span className="text-white/30 ml-1">({days}d)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
                </span>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  {trip.currency} {trip.budget.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="relative max-w-5xl mx-auto px-6 pb-0">
          <div className="flex gap-1 w-fit">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-gray-950 text-white'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/10'
                }`}
              >
                <span className="mr-1.5">{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-6">
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-200 mb-2">About this trip</h3>
              <p className="text-gray-400 leading-relaxed">{trip.description}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Days',        value: days,           suffix: '' },
                { label: 'Activities',  value: activityCount || '—', suffix: '' },
                { label: 'Items packed', value: packedCount || '—',
                  suffix: trip.packingList.length > 0 ? `/${trip.packingList.length}` : '' },
                { label: 'Interests',   value: trip.interests.length, suffix: '' },
              ].map(({ label, value, suffix }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
                  <p className="text-2xl font-bold text-indigo-400">
                    {value}
                    {suffix && <span className="text-base text-gray-500">{suffix}</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-200 mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {trip.interests.map(id => (
                  <span
                    key={id}
                    className="text-sm bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-3 py-1 rounded-full"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { tab: 'itinerary' as DetailTab, emoji: '🗺️', title: 'View Itinerary', desc: trip.itinerary.length ? `${days} days planned` : 'Generate with AI' },
                { tab: 'packing'   as DetailTab, emoji: '🧳', title: 'Packing List',   desc: trip.packingList.length ? `${packedCount}/${trip.packingList.length} packed` : 'Generate with AI' },
                { tab: 'chat'      as DetailTab, emoji: '💬', title: 'AI Assistant',   desc: 'Ask anything about your trip' },
              ].map(({ tab, emoji, title, desc }) => (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className="flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-4 text-left transition group"
                >
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="font-medium text-gray-200 group-hover:text-white transition text-sm">{title}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'itinerary' && (
          <Itinerary trip={trip} onGenerate={onGenerateItinerary} />
        )}

        {activeTab === 'packing' && (
          <PackingList trip={trip} onGenerate={onGeneratePackingList} onUpdate={onUpdateTrip} />
        )}

        {activeTab === 'chat' && (
          <AIChat
            trip={trip}
            apiKey={apiKey}
            getChatHistory={getChatHistory}
            saveChatHistory={saveChatHistory}
          />
        )}
      </div>
    </div>
  );
}
