import { useState, useRef, useCallback } from 'react';
import {
  Loader2, Sparkles, Clock, MapPin, Utensils, Train, Bed,
  Star, Coffee, Pencil, Trash2, Plus, Check, X, DollarSign, Lock, Settings,
  Mic, MicOff, BookmarkCheck, Wand2, Timer, ListChecks, AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Trip, Activity, ItineraryDay, TripDocument } from '../types';
import { parseVoiceActivity, VoiceParseResult } from '../services/ai';

const CATEGORIES = ['accommodation', 'transport', 'food', 'activity', 'sightseeing', 'free', 'reservation'] as const;

const CATEGORY_STYLE: Record<Activity['category'], { Icon: React.ElementType; cls: string }> = {
  accommodation: { Icon: Bed,           cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  transport:     { Icon: Train,         cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  food:          { Icon: Utensils,      cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  activity:      { Icon: Star,          cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  sightseeing:   { Icon: MapPin,        cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  free:          { Icon: Coffee,        cls: 'text-gray-400 bg-gray-500/10 border-gray-700' },
  reservation:   { Icon: BookmarkCheck, cls: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
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
  documents?: TripDocument[];
}

function ActivityEditForm({ value, onChange, onSave, onCancel, documents }: EditFormProps) {
  const { t } = useTranslation('trip');
  const [reminderInput, setReminderInput] = useState('');
  const inputCls =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition';

  return (
    <div className="bg-gray-900 border border-indigo-500/40 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('itinerary.form.time')}</label>
          <input
            type="time"
            value={value.time ?? '09:00'}
            onChange={e => onChange({ ...value, time: e.target.value })}
            className={inputCls + ' [color-scheme:dark]'}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('itinerary.form.category')}</label>
          <select
            value={value.category ?? 'activity'}
            onChange={e => onChange({ ...value, category: e.target.value as Activity['category'] })}
            className={inputCls}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{t(`itinerary.categories.${c}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('itinerary.form.activityName')}</label>
        <input
          type="text"
          value={value.title ?? ''}
          onChange={e => onChange({ ...value, title: e.target.value })}
          placeholder={t('itinerary.form.activityPlaceholder')}
          className={inputCls}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('itinerary.form.description')}</label>
        <textarea
          value={value.description ?? ''}
          onChange={e => onChange({ ...value, description: e.target.value })}
          placeholder={t('itinerary.form.descPlaceholder')}
          rows={2}
          className={inputCls + ' resize-none'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            <DollarSign className="w-3 h-3 inline" /> {t('itinerary.form.cost')}
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
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            <Timer className="w-3 h-3 inline" /> {t('itinerary.form.duration')}
          </label>
          <input
            type="text"
            value={value.duration ?? ''}
            onChange={e => onChange({ ...value, duration: e.target.value || undefined })}
            placeholder={t('itinerary.form.durationPlaceholder')}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          <ListChecks className="w-3 h-3 inline" /> {t('itinerary.form.reminders')}
        </label>
        {(value.reminders ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(value.reminders ?? []).map((r, i) => (
              <span key={i} className="flex items-center gap-1 text-xs bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded-full px-2.5 py-1">
                {r}
                <button
                  type="button"
                  onClick={() => onChange({ ...value, reminders: (value.reminders ?? []).filter((_, j) => j !== i) })}
                  className="ml-0.5 hover:text-amber-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={reminderInput}
          onChange={e => setReminderInput(e.target.value)}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ',') && reminderInput.trim()) {
              e.preventDefault();
              onChange({ ...value, reminders: [...(value.reminders ?? []), reminderInput.trim()] });
              setReminderInput('');
            }
          }}
          placeholder={t('itinerary.form.reminderPlaceholder')}
          className={inputCls}
        />
      </div>

      {documents && documents.length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('itinerary.form.document')}</label>
          <select
            value={value.documentId ?? ''}
            onChange={e => onChange({ ...value, documentId: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">{t('itinerary.form.noDocument')}</option>
            {documents.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
        >
          <X className="w-3.5 h-3.5" /> {t('itinerary.form.cancel')}
        </button>
        <button
          onClick={onSave}
          disabled={!value.title?.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg font-medium transition"
        >
          <Check className="w-3.5 h-3.5" /> {t('itinerary.form.save')}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Itinerary({ trip, onGenerate, onUpdate, hasAiKey, onSettingsClick }: Props) {
  const { t, i18n } = useTranslation('trip');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [selectedDay, setSelectedDay]   = useState(0);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editForm, setEditForm]         = useState<Partial<Activity>>({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]     = useState('');

  // Voice-to-activity state
  const [voiceOpen, setVoiceOpen]       = useState(false);
  const [isRecording, setIsRecording]   = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceInterim, setVoiceInterim] = useState('');
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceParsed, setVoiceParsed]   = useState<VoiceParseResult | null>(null);
  const [voiceCandidates, setVoiceCandidates] = useState<string[]>([]);
  const [voiceMergeTarget, setVoiceMergeTarget] = useState<Activity | null>(null);
  const [voiceError, setVoiceError]     = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const micSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startRecording = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.lang = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const word = e.results[i][0].transcript.trim();
          setVoiceTranscript(prev => prev ? prev + ' ' + word : word);
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setVoiceInterim(interim);
    };
    rec.onend = () => {
      setIsRecording(false);
      setVoiceInterim('');
      recognitionRef.current = null;
    };
    rec.onerror = () => {
      setIsRecording(false);
      setVoiceInterim('');
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  }, [i18n.language]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Client-side similarity: ≥2 significant words overlap, or same category within 90 min
  const findSimilarActivity = (dayDate: string, candidate: Partial<Activity>): Activity | null => {
    const dayActivities = trip.itinerary.find(d => d.date === dayDate)?.activities ?? [];
    const stopWords = new Set(['le', 'la', 'les', 'de', 'du', 'au', 'à', 'un', 'une', 'the', 'a', 'an', 'at', 'in', 'to']);
    const words = (s: string) => s.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    const newWords = words(candidate.title ?? '');
    for (const act of dayActivities) {
      const common = words(act.title).filter(w => newWords.includes(w));
      if (common.length >= 2) return act;
      if (act.category === candidate.category && act.time && candidate.time) {
        const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        if (Math.abs(toMin(act.time) - toMin(candidate.time)) <= 90) return act;
      }
    }
    return null;
  };

  const handleVoiceParse = async () => {
    const text = (voiceTranscript + ' ' + voiceInterim).trim();
    if (!text) return;
    if (isRecording) stopRecording();
    setVoiceParsing(true);
    setVoiceError('');
    try {
      const result = await parseVoiceActivity(text, trip);
      if (!result) { setVoiceError(t('itinerary.voice.failed')); return; }
      if (result.candidateDates) {
        setVoiceParsed(result);
        setVoiceCandidates(result.candidateDates);
      } else {
        const similar = findSimilarActivity(result.dayDate, result.activity);
        setVoiceMergeTarget(similar);
        setVoiceParsed(result);
      }
    } catch {
      setVoiceError(t('itinerary.voice.failed'));
    } finally {
      setVoiceParsing(false);
    }
  };

  const selectCandidateDate = (date: string) => {
    if (!voiceParsed) return;
    const resolved = { dayDate: date, activity: voiceParsed.activity };
    const similar = findSimilarActivity(date, voiceParsed.activity);
    setVoiceCandidates([]);
    setVoiceMergeTarget(similar);
    setVoiceParsed(resolved as typeof voiceParsed);
  };

  const insertVoiceActivity = (dayDate: string, activity: Partial<Activity>) => {
    const targetDay = trip.itinerary.find(d => d.date === dayDate);
    if (!targetDay) return;
    const newActivity: Activity = {
      id: nanoid(),
      time: activity.time ?? '12:00',
      title: activity.title ?? '',
      description: activity.description ?? '',
      category: activity.category ?? 'activity',
      estimatedCost: activity.estimatedCost ?? 0,
      reminders: activity.reminders,
      duration: activity.duration,
    };
    onUpdate({
      ...trip,
      itinerary: trip.itinerary.map(d =>
        d.id === targetDay.id
          ? { ...d, activities: [...d.activities, newActivity].sort((a, b) => a.time.localeCompare(b.time)) }
          : d
      ),
    });
    const dayIdx = trip.itinerary.findIndex(d => d.date === dayDate);
    if (dayIdx >= 0) setSelectedDay(dayIdx);
    resetVoice();
  };

  const mergeVoiceActivity = (dayDate: string, existing: Activity, incoming: Partial<Activity>) => {
    const merged: Activity = {
      ...existing,
      description: (incoming.description && incoming.description.length > existing.description.length)
        ? incoming.description : existing.description,
      reminders: [...(existing.reminders ?? []), ...(incoming.reminders ?? [])].filter((r, i, arr) => arr.indexOf(r) === i),
      duration: incoming.duration ?? existing.duration,
      time: incoming.time ?? existing.time,
    };
    onUpdate({
      ...trip,
      itinerary: trip.itinerary.map(d =>
        d.date === dayDate
          ? { ...d, activities: d.activities.map(a => a.id === existing.id ? merged : a).sort((a, b) => a.time.localeCompare(b.time)) }
          : d
      ),
    });
    const dayIdx = trip.itinerary.findIndex(d => d.date === dayDate);
    if (dayIdx >= 0) setSelectedDay(dayIdx);
    resetVoice();
  };

  const confirmVoiceActivity = () => {
    if (!voiceParsed || !voiceParsed.dayDate) return;
    insertVoiceActivity(voiceParsed.dayDate, voiceParsed.activity);
  };

  const resetVoice = () => {
    if (isRecording) stopRecording();
    setVoiceOpen(false);
    setVoiceTranscript('');
    setVoiceInterim('');
    setVoiceParsed(null);
    setVoiceCandidates([]);
    setVoiceMergeTarget(null);
    setVoiceError('');
    setVoiceParsing(false);
  };

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
        <h3 className="text-xl font-semibold text-gray-200 mb-2">{t('itinerary.empty.title')}</h3>
        <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">
          {hasAiKey ? t('itinerary.empty.desc') : t('itinerary.empty.noAiDesc')}
        </p>
        {error && (
          <div className="mb-5 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 max-w-sm">{error}</div>
        )}
        {hasAiKey ? (
          <button onClick={handleGenerate} disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl font-medium transition">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Generating itinerary…' : t('itinerary.empty.generate')}
          </button>
        ) : (
          <button onClick={onSettingsClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition">
            <Settings className="w-4 h-4" />
            {t('itinerary.empty.setup')}
          </button>
        )}
      </div>
    );
  }

  const day = trip.itinerary[selectedDay];

  // Day label for voice preview
  const voiceDayLabel = voiceParsed
    ? (() => {
        const d = new Date(voiceParsed.dayDate + 'T12:00:00');
        return d.toLocaleDateString(i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US', {
          weekday: 'long', day: 'numeric', month: 'long',
        });
      })()
    : '';

  return (
    <div className="space-y-4">

      {/* ── Voice capture panel ── */}
      {!voiceOpen ? (
        <button
          onClick={() => { setVoiceOpen(true); setVoiceTranscript(''); setVoiceParsed(null); setVoiceError(''); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl text-sm text-gray-500 hover:text-indigo-400 transition"
        >
          <Mic className="w-4 h-4" />
          {t('itinerary.voice.button')}
        </button>
      ) : (
        <div className="bg-gray-900 border border-indigo-500/30 rounded-2xl p-5 space-y-4">
          {voiceCandidates.length > 0 && voiceParsed ? (
            /* ── Step 1: Date disambiguation ── */
            <div className="space-y-3">
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                {t('itinerary.voice.whichDay')}
              </p>
              <p className="text-sm text-gray-300 font-medium">"{voiceParsed.activity.title}"</p>
              <div className="flex flex-col gap-2">
                {voiceCandidates.map(date => {
                  const d = new Date(date + 'T12:00:00');
                  const label = d.toLocaleDateString(i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
                  const dayEntry = trip.itinerary.find(it => it.date === date);
                  return (
                    <button
                      key={date}
                      onClick={() => selectCandidateDate(date)}
                      className="flex items-center justify-between w-full px-4 py-3 bg-gray-800 hover:bg-indigo-500/20 hover:border-indigo-500/50 border border-gray-700 rounded-xl text-left transition"
                    >
                      <span className="text-sm font-medium text-gray-200 capitalize">{label}</span>
                      {dayEntry && <span className="text-xs text-gray-500 truncate ml-2">{dayEntry.title}</span>}
                    </button>
                  );
                })}
              </div>
              <button onClick={resetVoice} className="text-xs text-gray-500 hover:text-gray-300 transition">
                {t('itinerary.voice.cancel')}
              </button>
            </div>
          ) : voiceParsed && voiceMergeTarget ? (
            /* ── Step 2: Merge or add ── */
            <div className="space-y-3">
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                {t('itinerary.voice.similarFound')}
              </p>
              <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
                <p className="font-semibold text-gray-100 mb-0.5">{voiceMergeTarget.title}</p>
                <p className="text-xs text-gray-500">{voiceMergeTarget.time} · {t(`itinerary.categories.${voiceMergeTarget.category}`)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => mergeVoiceActivity(voiceParsed.dayDate!, voiceMergeTarget, voiceParsed.activity)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-sm font-medium text-amber-300 transition"
                >
                  <Plus className="w-4 h-4" />
                  {t('itinerary.voice.enrichExisting')}
                </button>
                <button
                  onClick={confirmVoiceActivity}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition"
                >
                  <Plus className="w-4 h-4" />
                  {t('itinerary.voice.addSeparate')}
                </button>
              </div>
              <button onClick={resetVoice} className="text-xs text-gray-500 hover:text-gray-300 transition w-full text-center">
                {t('itinerary.voice.cancel')}
              </button>
            </div>
          ) : voiceParsed ? (
            /* ── Step 3: Preview & confirm ── */
            <div className="space-y-3">
              <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">
                {t('itinerary.voice.preview')}
              </p>
              <div className="bg-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>📅</span>
                  <span className="capitalize">{voiceDayLabel}</span>
                  {voiceParsed.activity.time && (
                    <span className="ml-auto font-mono text-gray-300">{voiceParsed.activity.time}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const cat = voiceParsed.activity.category ?? 'activity';
                    const style = CATEGORY_STYLE[cat as Activity['category']] ?? CATEGORY_STYLE.activity;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs ${style.cls}`}>
                        <style.Icon className="w-3 h-3" />
                        {t(`itinerary.categories.${cat}`)}
                      </span>
                    );
                  })()}
                </div>
                <p className="font-semibold text-gray-100">{voiceParsed.activity.title}</p>
                {voiceParsed.activity.description && (
                  <p className="text-sm text-gray-400">{voiceParsed.activity.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmVoiceActivity}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition"
                >
                  <Check className="w-4 h-4" />
                  {t('itinerary.voice.addToDay')}
                </button>
                <button
                  onClick={resetVoice}
                  className="px-4 py-2.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-xl text-sm transition"
                >
                  {t('itinerary.voice.cancel')}
                </button>
              </div>
            </div>
          ) : voiceParsing ? (
            /* ── Analyzing ── */
            <div className="flex flex-col items-center gap-3 py-4">
              <Wand2 className="w-6 h-6 text-indigo-400 animate-pulse" />
              <p className="text-sm text-gray-400">{t('itinerary.voice.analyzing')}</p>
              {voiceTranscript && (
                <p className="text-xs text-gray-500 italic text-center max-w-sm">"{voiceTranscript}"</p>
              )}
            </div>
          ) : (
            /* ── Recording ── */
            <div className="space-y-3">
              {!micSupported ? (
                <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
                  {t('itinerary.voice.unsupported')}
                </p>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isRecording
                        ? 'bg-red-500/20 border-2 border-red-500 text-red-400 scale-105'
                        : 'bg-indigo-500/15 border-2 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/25 hover:scale-105'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                  </button>
                  <p className="text-xs text-gray-500">
                    {isRecording ? t('itinerary.voice.tapStop') : t('itinerary.voice.tapStart')}
                  </p>
                  {isRecording && voiceInterim && (
                    <p className="text-sm text-indigo-300 italic text-center px-4 max-w-sm">{voiceInterim}…</p>
                  )}
                  {voiceTranscript && (
                    <p className="text-sm text-gray-300 text-center px-4 max-w-sm">"{voiceTranscript}"</p>
                  )}
                </div>
              )}

              {voiceError && (
                <p className="text-xs text-red-400 text-center">{voiceError}</p>
              )}

              <div className="flex gap-2">
                {voiceTranscript && !isRecording && (
                  <button
                    onClick={handleVoiceParse}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition"
                  >
                    <Wand2 className="w-4 h-4" />
                    {t('itinerary.voice.analyzing').replace('…', '')}
                  </button>
                )}
                <button
                  onClick={resetVoice}
                  className="px-4 py-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-xl text-sm transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Budget bar ── */}
      {totalEst > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-400 font-medium">{t('itinerary.budget.title')}</span>
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
                {overBudget
                  ? t('itinerary.budget.over', { currency: trip.currency, amount: Math.abs(remaining).toLocaleString() })
                  : t('itinerary.budget.under', { currency: trip.currency, amount: remaining.toLocaleString() })}
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
            {t('itinerary.budget.based', {
              count: allActivities.filter(a => a.estimatedCost > 0).length,
              travelers: trip.travelers,
            })}
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
                <span className="text-xs">{t('itinerary.buttons.regen')}</span>
              </button>
            ) : (
              <button onClick={onSettingsClick}
                className="md:hidden shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-gray-700 hover:text-gray-500 hover:bg-gray-800 rounded-xl transition"
                title={t('itinerary.buttons.setupRegen')}>
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs">AI</span>
              </button>
            )}
          </div>
          {/* Regen on desktop */}
          {hasAiKey ? (
            <button onClick={handleGenerate} disabled={loading} title={t('itinerary.buttons.regenerate')}
              className="hidden md:flex w-full mt-1 p-2 text-xs text-gray-600 hover:text-gray-400 hover:bg-gray-800 rounded-xl transition items-center justify-center gap-1">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {t('itinerary.buttons.regen')}
            </button>
          ) : (
            <button onClick={onSettingsClick} title={t('itinerary.buttons.setupRegen')}
              className="hidden md:flex w-full mt-1 p-2 text-xs text-gray-700 hover:text-gray-500 hover:bg-gray-800 rounded-xl transition items-center justify-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {t('itinerary.buttons.regen')}
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

          {/* Day reminders summary */}
          {(() => {
            const dayReminders = (day.activities ?? []).flatMap(a =>
              (a.reminders ?? []).map(r => ({ r, title: a.title }))
            );
            if (dayReminders.length === 0) return null;
            return (
              <div className="mb-4 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">{t('itinerary.dayReminders')}</span>
                </div>
                <ul className="space-y-1">
                  {dayReminders.map(({ r, title }, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-amber-200/80">
                      <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                      <span>{r} <span className="text-amber-500/60">— {title}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

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
                    documents={trip.documents}
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
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {act.duration && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Timer className="w-3 h-3" />{act.duration}
                        </span>
                      )}
                      {act.estimatedCost > 0 && (
                        <span className="text-xs text-gray-600">
                          ~{trip.currency}{act.estimatedCost} /pers · {trip.currency}{(act.estimatedCost * trip.travelers).toLocaleString()} total
                        </span>
                      )}
                    </div>
                    {act.reminders && act.reminders.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {act.reminders.map((r, i) => (
                          <span key={i} className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5">
                            {r}
                          </span>
                        ))}
                      </div>
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
                documents={trip.documents}
              />
            )}

            {/* Add activity button */}
            {!editingId && (
              <button
                onClick={() => addActivity(day.id)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl text-sm text-gray-500 hover:text-indigo-400 transition"
              >
                <Plus className="w-4 h-4" />
                {t('itinerary.buttons.addActivity')}
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
