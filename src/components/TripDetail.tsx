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
  Pencil,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useRef } from 'react';
import { Trip, DetailTab, ChatMessage } from '../types';
import Itinerary from './Itinerary';
import PackingList from './PackingList';
import AIChat from './AIChat';
import TripMap from './TripMap';
import TripSearch from './TripSearch';
import TripDocuments from './TripDocuments';
import LanguageSwitcher from './LanguageSwitcher';

interface Props {
  trip: Trip;
  uid: string;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onBack: () => void;
  onDelete: (id: string) => void;
  onGenerateItinerary: (trip: Trip) => Promise<Trip>;
  onGeneratePackingList: (trip: Trip) => Promise<Trip>;
  onUpdateTrip: (trip: Trip) => void;
  getChatHistory: (tripId: string) => Promise<ChatMessage[]>;
  saveChatHistory: (tripId: string, messages: ChatMessage[]) => Promise<void>;
  hasGenerationKey: boolean;
  hasSearchKey: boolean;
  onSettingsClick: () => void;
}

const ALL_TAB_IDS: DetailTab[] = ['overview', 'itinerary', 'packing', 'documents', 'map', 'chat', 'search'];

const TABS_META: { id: DetailTab; emoji: string; searchOnly?: boolean }[] = [
  { id: 'overview',   emoji: '🏠' },
  { id: 'itinerary',  emoji: '🗺️' },
  { id: 'packing',    emoji: '🧳' },
  { id: 'documents',  emoji: '📎' },
  { id: 'map',        emoji: '📍' },
  { id: 'chat',       emoji: '💬', searchOnly: true },
  { id: 'search',     emoji: '🔍', searchOnly: true },
];

function loadTabOrder(): DetailTab[] {
  try {
    const saved = localStorage.getItem('wandr-tab-order');
    if (saved) {
      const arr: DetailTab[] = JSON.parse(saved);
      if (arr.length === ALL_TAB_IDS.length && ALL_TAB_IDS.every(id => arr.includes(id))) return arr;
    }
  } catch {}
  return ALL_TAB_IDS;
}

const STATUS_CYCLE: Record<Trip['status'], Trip['status']> = {
  planning: 'upcoming', upcoming: 'completed', completed: 'planning',
};

const STATUS_STYLE: Record<Trip['status'], string> = {
  planning:  'bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30',
  upcoming:  'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30',
  completed: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30',
};

export default function TripDetail({
  trip, uid, activeTab, onTabChange, onBack, onDelete,
  onGenerateItinerary, onGeneratePackingList, onUpdateTrip,
  getChatHistory, saveChatHistory,
  hasGenerationKey, hasSearchKey, onSettingsClick,
}: Props) {
  const { t } = useTranslation('trip');

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(trip.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Tab drag-to-reorder
  const [tabOrder, setTabOrder] = useState<DetailTab[]>(loadTabOrder);
  const [dragTabId, setDragTabId] = useState<DetailTab | null>(null);
  const [dropIdx, setDropIdx] = useState(-1);

  function onTabPointerDown(e: React.PointerEvent, tabId: DetailTab, locked: boolean) {
    if (locked) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragTabId(tabId);
  }
  function onTabPointerMove(e: React.PointerEvent) {
    if (!dragTabId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el?.closest('[data-tabidx]') as HTMLElement | null;
    if (btn?.dataset.tabidx !== undefined) setDropIdx(Number(btn.dataset.tabidx));
  }
  function onTabPointerUp() {
    if (dragTabId && dropIdx >= 0) {
      const fromIdx = tabOrder.indexOf(dragTabId);
      if (fromIdx !== dropIdx) {
        const next = [...tabOrder];
        const [rem] = next.splice(fromIdx, 1);
        next.splice(dropIdx, 0, rem);
        setTabOrder(next);
        localStorage.setItem('wandr-tab-order', JSON.stringify(next));
      }
    }
    setDragTabId(null);
    setDropIdx(-1);
  }

  const startNameEdit = () => {
    setNameValue(trip.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitNameEdit = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== trip.name) onUpdateTrip({ ...trip, name: trimmed });
    else setNameValue(trip.name);
    setEditingName(false);
  };

  const start = new Date(trip.startDate + 'T12:00:00');
  const end   = new Date(trip.endDate   + 'T12:00:00');
  const days  = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;

  const handleDelete = () => {
    if (confirm(t('overview.deleteConfirm', { name: trip.name }))) onDelete(trip.id);
  };

  const cycleStatus = () => onUpdateTrip({ ...trip, status: STATUS_CYCLE[trip.status] });

  const packedCount       = trip.packingList.filter(i => i.packed).length;
  const totalEstPerPerson = trip.itinerary.flatMap(d => d.activities ?? []).reduce((s, a) => s + (a.estimatedCost || 0), 0);
  const totalEst          = totalEstPerPerson * trip.travelers;
  const remaining         = trip.budget - totalEst;
  const budgetPct         = Math.min(100, trip.budget > 0 ? (totalEst / trip.budget) * 100 : 0);
  const overBudget        = remaining < 0;
  const noAnyKey          = !hasGenerationKey && !hasSearchKey;

  const TABS = TABS_META.map(m => ({ ...m, label: t(`tabs.${m.id}`) }));

  const _sorted = [...TABS].sort((a, b) => tabOrder.indexOf(a.id) - tabOrder.indexOf(b.id));
  const sortedTabs = (() => {
    if (!dragTabId || dropIdx < 0) return _sorted;
    const from = _sorted.findIndex(t => t.id === dragTabId);
    if (from < 0 || from === dropIdx) return _sorted;
    const preview = [..._sorted];
    const [rem] = preview.splice(from, 1);
    preview.splice(dropIdx, 0, rem);
    return preview;
  })();

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
            <LanguageSwitcher />
            <button onClick={onSettingsClick}
              className="relative p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition"
              title={t('tooltips.settings')}>
              <Settings className="w-4 h-4" />
              {noAnyKey && (
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
              {editingName ? (
                <input
                  ref={nameInputRef}
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onBlur={commitNameEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitNameEdit(); if (e.key === 'Escape') { setEditingName(false); setNameValue(trip.name); } }}
                  className="text-xl md:text-2xl font-bold text-white leading-tight bg-white/10 border border-white/30 rounded-lg px-2 py-0.5 w-full outline-none focus:border-white/60"
                  autoFocus
                />
              ) : (
                <button onClick={startNameEdit} className="group flex items-center gap-1.5 text-left">
                  <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">{trip.name}</h1>
                  <Pencil className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80 shrink-0 mt-0.5 transition-colors" />
                </button>
              )}
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
          <div className="flex gap-1 w-fit overflow-x-auto" onPointerMove={onTabPointerMove} onPointerUp={onTabPointerUp} onPointerCancel={onTabPointerUp}>
            {sortedTabs.map((tab, i) => {
              const locked = !!(tab.searchOnly && !hasSearchKey);
              const isDragging = dragTabId === tab.id;
              const isDropTarget = dropIdx === i && dragTabId && dragTabId !== tab.id;
              return (
                <button key={tab.id}
                  data-tabidx={i}
                  onClick={() => !locked && !dragTabId && onTabChange(tab.id)}
                  onPointerDown={e => onTabPointerDown(e, tab.id, locked)}
                  disabled={locked}
                  style={{ touchAction: 'none' }}
                  className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition flex items-center gap-1.5 whitespace-nowrap select-none ${
                    locked
                      ? 'text-white/30 cursor-not-allowed'
                      : isDragging
                        ? 'opacity-40 cursor-grabbing bg-white/5'
                        : isDropTarget
                          ? 'ring-2 ring-indigo-400 ring-inset bg-white/10 text-white/90'
                          : activeTab === tab.id
                            ? 'bg-gray-950 text-white cursor-grab'
                            : 'text-white/60 hover:text-white/90 hover:bg-white/10 cursor-grab'
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
              <h3 className="font-semibold text-gray-200 mb-2">{t('overview.about')}</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base">{trip.description}</p>
            </div>

            {/* Must-dos by city */}
            {trip.mustDos && trip.mustDos.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6">
                <h3 className="font-semibold text-gray-200 mb-4">{t('overview.mustDos.title')}</h3>
                <div className="space-y-5">
                  {trip.mustDos.map(({ city, items }) => (
                    <div key={city}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-indigo-400 text-sm">📍</span>
                        <span className="text-sm font-semibold text-indigo-300">{city}</span>
                      </div>
                      <ul className="space-y-2 pl-5">
                        {items.map(item => {
                          const colonIdx = item.indexOf(' : ');
                          const hasPrefix = colonIdx !== -1;
                          const prefix = hasPrefix ? item.slice(0, colonIdx) : null;
                          const label = hasPrefix ? item.slice(colonIdx + 3) : item;
                          return (
                            <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                              <span className="text-indigo-500/70 mt-1 shrink-0">•</span>
                              <span>
                                {prefix && (
                                  <span className="inline-block text-xs font-medium text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 rounded px-1.5 py-0.5 mr-1.5 align-middle">{prefix}</span>
                                )}
                                {label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 text-center">
                <p className="text-xl md:text-2xl font-bold text-indigo-400">{days}</p>
                <p className="text-xs text-gray-500 mt-1">{t('overview.stats.days')}</p>
              </div>
            </div>

            {/* Provisional budget */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-200">{t('overview.budget.title')}</h3>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  totalEst === 0 ? 'bg-gray-800 text-gray-500 border-gray-700'
                  : overBudget   ? 'bg-red-500/15 text-red-300 border-red-500/25'
                  :                'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                }`}>
                  {totalEst === 0
                    ? t('overview.budget.noEstimates')
                    : overBudget
                    ? t('overview.budget.over', { currency: trip.currency, amount: Math.abs(remaining).toLocaleString() })
                    : t('overview.budget.under', { currency: trip.currency, amount: remaining.toLocaleString() })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 text-center">
                {[
                  { label: t('overview.budget.allocated'), val: `${trip.currency} ${trip.budget.toLocaleString()}`,  color: 'text-gray-200' },
                  { label: t('overview.budget.estSpend'),  val: `${trip.currency} ${totalEst.toLocaleString()}`,     color: totalEst === 0 ? 'text-gray-500' : overBudget ? 'text-red-400' : 'text-gray-200' },
                  { label: t('overview.budget.remaining'), val: totalEst === 0 ? '—' : `${trip.currency} ${remaining.toLocaleString()}`, color: totalEst === 0 ? 'text-gray-500' : overBudget ? 'text-red-400' : 'text-emerald-400' },
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
                  ? t('overview.budget.hint')
                  : t('overview.budget.perPerson', { currency: trip.currency, amount: totalEstPerPerson.toLocaleString(), count: trip.travelers })}
              </p>
            </div>

            {/* Quick-action cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  tab: 'itinerary' as DetailTab, emoji: '🗺️',
                  title: t('overview.cards.itinerary.title'),
                  desc: trip.itinerary.length
                    ? t('overview.cards.itinerary.withDays', { days })
                    : t('overview.cards.itinerary.desc'),
                  locked: false,
                },
                {
                  tab: 'packing' as DetailTab, emoji: '🧳',
                  title: t('overview.cards.packing.title'),
                  desc: trip.packingList.length
                    ? t('overview.cards.packing.withProgress', { packed: packedCount, total: trip.packingList.length })
                    : t('overview.cards.packing.desc'),
                  locked: false,
                },
                {
                  tab: 'chat' as DetailTab, emoji: '💬',
                  title: t('overview.cards.chat.title'),
                  desc: hasSearchKey ? t('overview.cards.chat.desc') : t('overview.cards.chat.locked'),
                  locked: !hasSearchKey,
                },
                {
                  tab: 'search' as DetailTab, emoji: '🔍',
                  title: t('overview.cards.search.title'),
                  desc: hasSearchKey ? t('overview.cards.search.desc') : t('overview.cards.search.locked'),
                  locked: !hasSearchKey,
                },
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
          <Itinerary trip={trip} onGenerate={onGenerateItinerary} onUpdate={onUpdateTrip} hasAiKey={hasGenerationKey} onSettingsClick={onSettingsClick} />
        )}

        {activeTab === 'packing' && (
          <PackingList trip={trip} onGenerate={onGeneratePackingList} onUpdate={onUpdateTrip} hasAiKey={hasGenerationKey} onSettingsClick={onSettingsClick} />
        )}

        {activeTab === 'documents' && (
          <TripDocuments trip={trip} uid={uid} onUpdate={onUpdateTrip} />
        )}

        {activeTab === 'map' && (
          <TripMap trip={trip} />
        )}

        {activeTab === 'chat' && (
          <AIChat trip={trip}
            hasAiKey={hasSearchKey} onSettingsClick={onSettingsClick}
            getChatHistory={getChatHistory} saveChatHistory={saveChatHistory} />
        )}

        {activeTab === 'search' && (
          <TripSearch trip={trip} hasSearchKey={hasSearchKey} onSettingsClick={onSettingsClick} />
        )}
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-md border-t border-gray-800">
        <div className="flex items-center overflow-x-auto px-2 pt-1 pb-2 gap-1 scrollbar-hide" onPointerMove={onTabPointerMove} onPointerUp={onTabPointerUp} onPointerCancel={onTabPointerUp}>
          {sortedTabs.map((tab, i) => {
            const locked = !!(tab.searchOnly && !hasSearchKey);
            const isDragging = dragTabId === tab.id;
            const isDropTarget = dropIdx === i && dragTabId && dragTabId !== tab.id;
            return (
              <button key={tab.id}
                data-tabidx={i}
                onClick={() => !locked && !dragTabId && onTabChange(tab.id)}
                onPointerDown={e => onTabPointerDown(e, tab.id, locked)}
                disabled={locked}
                style={{ touchAction: 'none' }}
                className={`flex flex-col items-center gap-0.5 shrink-0 min-w-[52px] py-1.5 px-1 rounded-xl transition select-none ${
                  locked
                    ? 'text-gray-700 cursor-not-allowed'
                    : isDragging
                      ? 'opacity-30 scale-95'
                      : isDropTarget
                        ? 'ring-2 ring-indigo-400 text-indigo-300'
                        : activeTab === tab.id ? 'text-indigo-400' : 'text-gray-500'
                }`}>
                <span className={`text-xl leading-none ${locked ? 'grayscale opacity-40' : ''}`}>{tab.emoji}</span>
                <span className="text-[10px] font-medium flex items-center gap-0.5 whitespace-nowrap">
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
