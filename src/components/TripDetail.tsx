import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Trash2,
  RefreshCw,
  Settings,
  Lock,
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
  getChatHistory: (tripId: string) => Promise<ChatMessage[]>;
  saveChatHistory: (tripId: string, messages: ChatMessage[]) => Promise<void>;
  apiKey: string;
  hasAiKey: boolean;
  onSettingsClick: () => void;
}

const TABS: { id: DetailTab; label: string; emoji: string; aiOnly?: boolean }[] = [
  { id: 'overview',  label: 'Overview',  emoji: '🏠' },
  { id: 'itinerary', label: 'Itinerary', emoji: '🗺️' },
  { id: 'packing',   label: 'Packing',   emoji: '🧳' },
  { id: 'chat',      label: 'AI Chat',   emoji: '💬', aiOnly: true },
];

const STATUS_CYCLE: Record<Trip['status'], Trip['status']> = {
  planning: 'upcoming', upcoming: 'completed', completed: 'planning',
};

const STATUS_STYLE: Record<Trip['status'], string> = {
  planning:  'bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30',
  upcoming:  'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30',
  completed: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30',
};

export default function TripDetail({
  trip, activeTab, onTabChange, onBack, onDelete,
  onGenerateItinerary, onGeneratePackingList, onUpdateTrip,
  getChatHistory, saveChatHistory, apiKey, hasAiKey, onSettingsClick,
}: Props) {
  const start = new Date(trip.startDate + 'T12:00:00');
  const end   = new Date(trip.endDate   + 'T12:00:00');
  const days  = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;

  const handleDelete = () => {
    if (confirm(`Delete "${trip.name}"? This cannot be undone.`)) onDelete(trip.id);
  };

  const cycleStatus = () => onUpdateTrip({ ...trip, status: STATUS_CYCLE[trip.status] });

  const activityCount     = trip.itinerary.reduce((n, d) => n + d.activities.length, 0);
  const packedCount       = trip.packingList.filter(i => i.packed).length;
  const totalEstPerPerson = trip.itinerary.flatMap(d => d.activities).reduce((s, a) => s + (a.estimatedCost || 0), 0);
  const totalEst          = totalEstPerPerson * trip.travelers;
  const remaining         = trip.budget - totalEst;
  const budgetPct         = Math.min(100, trip.budget > 0 ? (totalEst / trip.budget) * 100 : 0);
  const overBudget        = remaining < 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 pb-16 md:pb-0">

      {/* ── Cover / hero ── */}
      <div className={`bg-gradient-to-br ${trip.coverGradient} relative`}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />

        {/* Top bar */}
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-4 flex items-center justify-between">
          <button onClick={onBack}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onSettingsClick}
              className="relative p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="API Settings">
              <Settings className="w-4 h-4" />
              {!hasAiKey && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full" />
              )}
            </button>
            <button onClick={cycleStatus}
              className={`text-xs px-2.5 py-1.5 rounded-full font-medium border transition ${STATUS_STYLE[trip.status]}`}>
              <RefreshCw className="w-3 h-3 inline mr-1" />
              {trip.status}
            </button>
            <button onClick={handleDelete}
              className="p-2 text-white/40 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trip info */}
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-3 pb-4 md:pb-5">
          <div className="flex items-start gap-3">
            <span className="text-4xl md:text-5xl drop-shadow-lg shrink-0 mt-0.5">{trip.emoji}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">{trip.name}</h1>
              <div className="flex items-center gap-1.5 mt-0.5 text-white/70">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm truncate">{trip.destination}</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-white/60 overflow-x-auto scrollbar-hide">
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  {start.toLocaleDateString('en', { month: 'short', day: 'numeric' })} –{' '}
                  {end.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  <span className="text-white/30 ml-1">({days}d)</span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <Users className="w-3.5 h-3.5" />
                  {trip.travelers}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <DollarSign className="w-3.5 h-3.5" />
                  {trip.currency} {trip.budget.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop-only tab bar */}
        <div className="hidden md:block relative max-w-5xl mx-auto px-6 pb-0">
          <div className="flex gap-1 w-fit">
            {TABS.map(tab => {
              const locked = tab.aiOnly && !hasAiKey;
              return (
                <button key={tab.id}
                  onClick={() => !locked && onTabChange(tab.id)}
                  disabled={locked}
                  className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition flex items-center gap-1.5 ${
                    locked
                      ? 'text-white/30 cursor-not-allowed'
                      : activeTab === tab.id
                        ? 'bg-gray-950 text-white'
                        : 'text-white/60 hover:text-white/90 hover:bg-white/10'
                  }`}>
                  <span>{tab.emoji}</span>
                  {tab.label}
                  {locked && <Lock className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-5 md:py-6">

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6">
              <h3 className="font-semibold text-gray-200 mb-2">About this trip</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base">{trip.description}</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Days',         value: days,                  suffix: '' },
                { label: 'Activities',   value: activityCount || '—',  suffix: '' },
                { label: 'Items packed', value: packedCount || '—',
                  suffix: trip.packingList.length > 0 ? `/${trip.packingList.length}` : '' },
                { label: 'Interests',    value: trip.interests.length, suffix: '' },
              ].map(({ label, value, suffix }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 text-center">
                  <p className="text-xl md:text-2xl font-bold text-indigo-400">
                    {value}
                    {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Provisional budget */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-200">Provisional Budget</h3>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  totalEst === 0 ? 'bg-gray-800 text-gray-500 border-gray-700'
                  : overBudget   ? 'bg-red-500/15 text-red-300 border-red-500/25'
                  :                'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                }`}>
                  {totalEst === 0 ? 'No estimates yet'
                   : overBudget  ? `▲ ${trip.currency}${Math.abs(remaining).toLocaleString()} over`
                   :               `▼ ${trip.currency}${remaining.toLocaleString()} left`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 text-center">
                {[
                  { label: 'Allocated',  val: `${trip.currency} ${trip.budget.toLocaleString()}`,  color: 'text-gray-200' },
                  { label: 'Est. spend', val: `${trip.currency} ${totalEst.toLocaleString()}`,     color: totalEst === 0 ? 'text-gray-500' : overBudget ? 'text-red-400' : 'text-gray-200' },
                  { label: 'Remaining',  val: totalEst === 0 ? '—' : `${trip.currency} ${remaining.toLocaleString()}`, color: totalEst === 0 ? 'text-gray-500' : overBudget ? 'text-red-400' : 'text-emerald-400' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-gray-800/60 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`font-semibold text-sm ${color}`}>{val}</p>
                  </div>
                ))}
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-red-500' : budgetPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${budgetPct}%` }} />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {totalEst === 0
                  ? 'Add cost estimates to activities to track spending.'
                  : `${trip.currency}${totalEstPerPerson.toLocaleString()} /person × ${trip.travelers} traveler(s)`}
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6">
              <h3 className="font-semibold text-gray-200 mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {trip.interests.map(id => (
                  <span key={id}
                    className="text-sm bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-3 py-1 rounded-full">
                    {id}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick-action cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { tab: 'itinerary' as DetailTab, emoji: '🗺️', title: 'Itinerary', desc: trip.itinerary.length ? `${days} days planned` : 'View & edit day-by-day', locked: false },
                { tab: 'packing'   as DetailTab, emoji: '🧳', title: 'Packing',   desc: trip.packingList.length ? `${packedCount}/${trip.packingList.length} packed` : 'View packing list', locked: false },
                { tab: 'chat'      as DetailTab, emoji: '💬', title: 'AI Chat',   desc: hasAiKey ? 'Ask anything about your trip' : 'Requires Perplexity API key', locked: !hasAiKey },
              ].map(({ tab, emoji, title, desc, locked }) => (
                <button key={tab}
                  onClick={() => !locked && onTabChange(tab)}
                  disabled={locked}
                  className={`flex items-center gap-3 bg-gray-900 border rounded-2xl p-4 text-left transition group ${
                    locked
                      ? 'border-gray-800 opacity-50 cursor-not-allowed'
                      : 'border-gray-800 hover:border-gray-600'
                  }`}>
                  <span className={`text-2xl ${locked ? 'grayscale' : ''}`}>{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm flex items-center gap-1.5 ${locked ? 'text-gray-500' : 'text-gray-200 group-hover:text-white transition'}`}>
                      {title}
                      {locked && <Lock className="w-3 h-3" />}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'itinerary' && (
          <Itinerary trip={trip} onGenerate={onGenerateItinerary} onUpdate={onUpdateTrip} hasAiKey={hasAiKey} onSettingsClick={onSettingsClick} />
        )}

        {activeTab === 'packing' && (
          <PackingList trip={trip} onGenerate={onGeneratePackingList} onUpdate={onUpdateTrip} hasAiKey={hasAiKey} onSettingsClick={onSettingsClick} />
        )}

        {activeTab === 'chat' && (
          <AIChat trip={trip} apiKey={apiKey} hasAiKey={hasAiKey} onSettingsClick={onSettingsClick}
            getChatHistory={getChatHistory} saveChatHistory={saveChatHistory} />
        )}
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-md border-t border-gray-800">
        <div className="flex items-center justify-around px-2 pt-1 pb-2">
          {TABS.map(tab => {
            const locked = tab.aiOnly && !hasAiKey;
            return (
              <button key={tab.id}
                onClick={() => !locked && onTabChange(tab.id)}
                disabled={locked}
                className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-xl transition ${
                  locked
                    ? 'text-gray-700 cursor-not-allowed'
                    : activeTab === tab.id ? 'text-indigo-400' : 'text-gray-500'
                }`}>
                <span className={`text-xl leading-none ${locked ? 'grayscale opacity-40' : ''}`}>{tab.emoji}</span>
                <span className="text-[10px] font-medium flex items-center gap-0.5">
                  {tab.label}
                  {locked && <Lock className="w-2.5 h-2.5" />}
                </span>
                {activeTab === tab.id && !locked && (
                  <span className="w-1 h-1 bg-indigo-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
