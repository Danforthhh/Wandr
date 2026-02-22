import { useState } from 'react';
import {
  Loader2, Sparkles, Clock, MapPin, Utensils, Train, Bed,
  Star, Coffee, Pencil, Trash2, Plus, Check, X, DollarSign, Lock, Settings,
} from 'lucide-react';
import { Trip, Activity, ItineraryDay } from '../types';

const CATEGORIES = ['accommodation', 'transport', 'food', 'activity', 'sightseeing', 'free'] as const;

const CATEGORY_STYLE: Record<Activity['category'], { Icon: React.ElementType; cls: string }> = {
  accommodation: { Icon: Bed,      cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  transport:     { Icon: Train,    cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  food:          { Icon: Utensils, cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  activity:      { Icon: Star,     cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  sightseeing:   { Icon: MapPin,   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  free:          { Icon: Coffee,   cls: 'text-gray-400 bg-gray-500/10 border-gray-700' },
};

function nanoid() {
  return Math.random().toString(36).slice(2, 9);
}

interface Props {
  trip: Trip;
  onGenerate: (trip: Trip) => Promise<Trip>;
  onUpdate: (trip: Trip) => void;
  hasAiKey: boolean;
  onSettingsClick: () => void;
}

// ── Inline activity editor ────────────────────────────────────────────────────
interface EditFormProps {
  value: Partial<Activity>;
  onChange: (v: Partial<Activity>) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ActivityEditForm({ value, onChange, onSave, onCancel }: EditFormProps) {
  const inputCls =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition';

  return (
    <div className="bg-gray-900 border border-indigo-500/40 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Time</label>
          <input
            type="time"
            value={value.time ?? '09:00'}
            onChange={e => onChange({ ...value, time: e.target.value })}
            className={inputCls + ' [color-scheme:dark]'}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Category</label>
          <select
            value={value.category ?? 'activity'}
            onChange={e => onChange({ ...value, category: e.target.value as Activity['category'] })}
            className={inputCls}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Activity name</label>
        <input
          type="text"
          value={value.title ?? ''}
          onChange={e => onChange({ ...value, title: e.target.value })}
          placeholder="e.g. Visit the Eiffel Tower"
          className={inputCls}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Description</label>
        <textarea
          value={value.description ?? ''}
          onChange={e => onChange({ ...value, description: e.target.value })}
          placeholder="Brief description…"
          rows={2}
          className={inputCls + ' resize-none'}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          <DollarSign className="w-3 h-3 inline" /> Estimated cost per person
        </label>
        <input
          type="number"
          min={0}
          step={5}
          value={value.estimatedCost ?? 0}
          onChange={e => onChange({ ...value, estimatedCost: Number(e.target.value) })}
          className={inputCls}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!value.title?.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg font-medium transition"
        >
          <Check className="w-3.5 h-3.5" /> Save
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Itinerary({ trip, onGenerate, onUpdate, hasAiKey, onSettingsClick }: Props) {
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editForm, setEditForm]     = useState<Partial<Activity>>({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]     = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setEditingId(null);
    try { await onGenerate(trip); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to generate itinerary'); }
    finally { setLoading(false); }
  };

  // ── Helpers to mutate trip ────────────────────────────────────────────────
  const updateDay = (dayId: string, updater: (d: ItineraryDay) => ItineraryDay) => {
    onUpdate({
      ...trip,
      itinerary: trip.itinerary.map(d => d.id === dayId ? updater(d) : d),
    });
  };

  const saveActivity = (dayId: string) => {
    if (!editingId) return;
    const isNew = !trip.itinerary.flatMap(d => d.activities).find(a => a.id === editingId);
    updateDay(dayId, d => ({
      ...d,
      activities: isNew
        ? [...d.activities, { id: editingId, time: '12:00', title: '', description: '', category: 'activity', estimatedCost: 0, ...editForm } as Activity]
        : d.activities.map(a => a.id === editingId ? { ...a, ...editForm } as Activity : a),
    }));
    setEditingId(null);
    setEditForm({});
  };

  const deleteActivity = (dayId: string, actId: string) => {
    updateDay(dayId, d => ({ ...d, activities: d.activities.filter(a => a.id !== actId) }));
  };

  const addActivity = (dayId: string) => {
    const newId = nanoid();
    setEditingId(newId);
    setEditForm({ time: '12:00', title: '', description: '', category: 'activity', estimatedCost: 0 });
  };

  const saveDayTitle = (dayId: string) => {
    if (titleDraft.trim()) updateDay(dayId, d => ({ ...d, title: titleDraft.trim() }));
    setEditingTitle(false);
  };

  // ── Budget calcs ──────────────────────────────────────────────────────────
  const allActivities = trip.itinerary.flatMap(d => d.activities ?? []);
  const totalEstPerPerson = allActivities.reduce((s, a) => s + (a.estimatedCost || 0), 0);
  const totalEst = totalEstPerPerson * trip.travelers;
  const remaining = trip.budget - totalEst;
  const overBudget = remaining < 0;
  const budgetPct = Math.min(100, trip.budget > 0 ? (totalEst / trip.budget) * 100 : 0);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (trip.itinerary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-5">
          <span className="text-3xl">🗺️</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-200 mb-2">No itinerary yet</h3>
        <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">
          {hasAiKey
            ? 'AI will create a personalized day-by-day schedule based on your destination, interests, and travel dates.'
            : 'Add activities manually using the button below, or set up your Perplexity API key to generate one with AI.'}
        </p>
        {error && (
          <div className="mb-5 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 max-w-sm">{error}</div>
        )}
        {hasAiKey ? (
          <button onClick={handleGenerate} disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl font-medium transition">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Generating itinerary…' : 'Generate Itinerary'}
          </button>
        ) : (
          <button onClick={onSettingsClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition">
            <Settings className="w-4 h-4" />
            Set up AI in Settings
          </button>
        )}
      </div>
    );
  }

  const day = trip.itinerary[selectedDay];

  return (
    <div className="space-y-4">
      {/* ── Budget bar ── */}
      {totalEst > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-400 font-medium">Provisional budget</span>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">
                <span className="text-gray-200 font-semibold">{trip.currency} {totalEst.toLocaleString()}</span>
                <span className="text-gray-600"> / {trip.currency} {trip.budget.toLocaleString()}</span>
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                overBudget
                  ? 'bg-red-500/15 text-red-300 border border-red-500/25'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
              }`}>
                {overBudget ? '▲ ' : '▼ '}
                {trip.currency} {Math.abs(remaining).toLocaleString()} {overBudget ? 'over' : 'left'}
              </span>
            </div>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-red-500' : budgetPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1.5">
            Based on {allActivities.filter(a => a.estimatedCost > 0).length} activities with cost estimates × {trip.travelers} traveler(s)
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 md:gap-5">
        {/* ── Day selector ── */}
        <div className="md:w-24 md:shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-hide pb-1 md:pb-0 md:space-y-1">
            {trip.itinerary.map((d, i) => {
              const date = new Date(d.date + 'T12:00:00');
              const selected = i === selectedDay;
              return (
                <button key={d.id} onClick={() => { setSelectedDay(i); setEditingId(null); }}
                  className={`shrink-0 md:w-full text-center px-3 md:px-2 py-2 md:py-2.5 rounded-xl transition ${
                    selected ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}>
                  <p className="text-xs font-medium opacity-80">{date.toLocaleDateString('en', { weekday: 'short' })}</p>
                  <p className="text-base md:text-xl font-bold leading-tight">{date.getDate()}</p>
                  <p className="text-xs opacity-60 hidden md:block">{date.toLocaleDateString('en', { month: 'short' })}</p>
                </button>
              );
            })}
            {/* Regen on mobile */}
            {hasAiKey ? (
              <button onClick={handleGenerate} disabled={loading}
                className="md:hidden shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-gray-600 hover:text-gray-400 hover:bg-gray-800 rounded-xl transition">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span className="text-xs">Regen</span>
              </button>
            ) : (
              <button onClick={onSettingsClick}
                className="md:hidden shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-gray-700 hover:text-gray-500 hover:bg-gray-800 rounded-xl transition"
                title="Set up AI key">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs">AI</span>
              </button>
            )}
          </div>
          {/* Regen on desktop */}
          {hasAiKey ? (
            <button onClick={handleGenerate} disabled={loading} title="Regenerate itinerary"
              className="hidden md:flex w-full mt-1 p-2 text-xs text-gray-600 hover:text-gray-400 hover:bg-gray-800 rounded-xl transition items-center justify-center gap-1">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Regen
            </button>
          ) : (
            <button onClick={onSettingsClick} title="Set up Perplexity key to regenerate"
              className="hidden md:flex w-full mt-1 p-2 text-xs text-gray-700 hover:text-gray-500 hover:bg-gray-800 rounded-xl transition items-center justify-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Regen
            </button>
          )}
        </div>

        {/* ── Day detail ── */}
        <div className="flex-1 min-w-0">
          {/* Day header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveDayTitle(day.id); if (e.key === 'Escape') setEditingTitle(false); }}
                    className="flex-1 bg-gray-800 border border-indigo-500 rounded-lg px-3 py-1.5 text-gray-100 text-base font-semibold focus:outline-none"
                    autoFocus
                  />
                  <button onClick={() => saveDayTitle(day.id)} className="p-1.5 text-emerald-400 hover:bg-gray-800 rounded-lg transition"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingTitle(false)} className="p-1.5 text-gray-500 hover:bg-gray-800 rounded-lg transition"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingTitle(true); setTitleDraft(day.title); }}
                  className="group flex items-center gap-2 text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-100 group-hover:text-white">{day.title}</h3>
                  <Pencil className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                </button>
              )}
              <p className="text-sm text-gray-400 mt-0.5">
                {new Date(day.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            {/* Day cost */}
            {(() => {
              const dayCost = (day.activities ?? []).reduce((s, a) => s + (a.estimatedCost || 0), 0) * trip.travelers;
              return dayCost > 0 ? (
                <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg shrink-0 ml-3 font-medium">
                  {trip.currency} {dayCost.toLocaleString()} est.
                </span>
              ) : null;
            })()}
          </div>

          {/* Activities */}
          <div className="space-y-2.5">
            {(day.activities ?? []).map((act: Activity) => {
              const { Icon, cls } = CATEGORY_STYLE[act.category] ?? CATEGORY_STYLE.free;

              if (editingId === act.id) {
                return (
                  <ActivityEditForm
                    key={act.id}
                    value={editForm}
                    onChange={setEditForm}
                    onSave={() => saveActivity(day.id)}
                    onCancel={() => { setEditingId(null); setEditForm({}); }}
                  />
                );
              }

              return (
                <div key={act.id}
                  className="group flex gap-3 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition">
                  <div className={`p-2 rounded-lg border shrink-0 ${cls}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <h4 className="font-medium text-gray-200 truncate">{act.title}</h4>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-gray-500 flex items-center gap-0.5 mr-1">
                          <Clock className="w-3 h-3" />{act.time}
                        </span>
                        <button
                          onClick={() => { setEditingId(act.id); setEditForm({ ...act }); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition"
                          title="Edit activity"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteActivity(day.id, act.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition"
                          title="Delete activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">{act.description}</p>
                    {act.estimatedCost > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        ~{trip.currency}{act.estimatedCost} /person · {trip.currency}{(act.estimatedCost * trip.travelers).toLocaleString()} total
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Inline form for a brand-new activity */}
            {editingId && !(day.activities ?? []).find(a => a.id === editingId) && (
              <ActivityEditForm
                value={editForm}
                onChange={setEditForm}
                onSave={() => saveActivity(day.id)}
                onCancel={() => { setEditingId(null); setEditForm({}); }}
              />
            )}

            {/* Add activity button */}
            {!editingId && (
              <button
                onClick={() => addActivity(day.id)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl text-sm text-gray-500 hover:text-indigo-400 transition"
              >
                <Plus className="w-4 h-4" />
                Add activity
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
