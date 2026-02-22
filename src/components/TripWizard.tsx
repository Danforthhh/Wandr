import { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Sparkles,
  Check,
  Plane,
  Settings,
  X,
  FileText,
  Image,
  Upload,
} from 'lucide-react';
import { Trip, TripContext, TripContextFile } from '../types';

const INTERESTS = [
  { id: 'culture',     label: 'Culture & History',  emoji: '🏛️' },
  { id: 'food',        label: 'Food & Dining',       emoji: '🍜' },
  { id: 'nature',      label: 'Nature & Outdoors',   emoji: '🏔️' },
  { id: 'adventure',   label: 'Adventure',           emoji: '🧗' },
  { id: 'beach',       label: 'Beach & Relaxation',  emoji: '🏖️' },
  { id: 'shopping',    label: 'Shopping',            emoji: '🛍️' },
  { id: 'nightlife',   label: 'Nightlife',           emoji: '🎭' },
  { id: 'photography', label: 'Photography',         emoji: '📸' },
  { id: 'family',      label: 'Family-Friendly',     emoji: '👨‍👩‍👧' },
  { id: 'luxury',      label: 'Luxury',              emoji: '✨' },
  { id: 'backpacking', label: 'Budget Travel',       emoji: '🎒' },
  { id: 'wellness',    label: 'Wellness & Spa',      emoji: '🧘' },
];

const BUDGET_PRESETS = [500, 1500, 3000, 5000, 10000];

const MAX_FILES      = 5;
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

interface CreateParams {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  interests: string[];
  context?: TripContext;
}

interface Props {
  onBack: () => void;
  onCreate: (params: CreateParams) => Promise<Trip>;
  hasAiKey: boolean;
  hasClaudeKey: boolean;
  onSettingsClick: () => void;
}

function nanoid() { return Math.random().toString(36).slice(2, 9); }

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TripWizard({ onBack, onCreate, hasAiKey, hasClaudeKey, onSettingsClick }: Props) {
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  // Step 1
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [travelers, setTravelers]     = useState(2);

  // Step 2
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget]       = useState(3000);
  const [currency, setCurrency]   = useState('USD');

  // Step 3 – context
  const [contextText, setContextText]   = useState('');
  const [contextFiles, setContextFiles] = useState<TripContextFile[]>([]);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [fileError, setFileError]       = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split('T')[0];

  const canNext1 =
    destination.trim() !== '' &&
    startDate !== '' &&
    endDate !== '' &&
    new Date(endDate) >= new Date(startDate);
  const canNext2 = interests.length > 0 && budget > 0;

  const tripDays =
    startDate && endDate
      ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1
      : null;

  const toggleInterest = (id: string) =>
    setInterests(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));

  // ── File handling ───────────────────────────────────────────────────────────

  const ACCEPTED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/markdown',
  ];
  const ACCEPTED_EXT = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.md';

  const addFiles = useCallback((incoming: FileList | File[]) => {
    setFileError('');
    const arr = Array.from(incoming);
    const remaining = MAX_FILES - contextFiles.length;
    if (remaining <= 0) { setFileError(`Maximum ${MAX_FILES} files.`); return; }

    let added = 0;
    arr.slice(0, remaining).forEach(file => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setFileError(`"${file.name}" is not a supported file type.`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`"${file.name}" exceeds the 4 MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target?.result as string;
        const dataBase64 = dataUrl.split(',')[1];
        const entry: TripContextFile = {
          id: nanoid(),
          name: file.name,
          mimeType: file.type,
          dataBase64,
          previewUrl: file.type.startsWith('image/') ? dataUrl : undefined,
          size: file.size,
        };
        setContextFiles(prev => [...prev, entry]);
      };
      reader.readAsDataURL(file);
      added++;
    });
    if (arr.length > remaining + added) {
      setFileError(`Only the first ${remaining} files were added (limit: ${MAX_FILES}).`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextFiles.length]);

  const removeFile = (id: string) =>
    setContextFiles(prev => prev.filter(f => f.id !== id));

  // ── Create ──────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    const context: TripContext = {
      text:  contextText.trim() || undefined,
      files: contextFiles.length ? contextFiles : undefined,
    };
    try {
      await onCreate({
        destination, startDate, endDate, travelers, budget, currency, interests,
        context: (context.text || context.files) ? context : undefined,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create trip');
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-100">New Trip</h1>
            <p className="text-xs text-gray-500">Step {step} of 4</p>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                  s <= step ? 'bg-indigo-500' : 'bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">

        {/* ── Step 1: Destination & Dates ── */}
        {step === 1 && (
          <div className="space-y-7">
            <div>
              <h2 className="text-2xl font-bold text-gray-100 mb-1">Where are you going?</h2>
              <p className="text-gray-400">Tell us your destination and travel dates.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-1.5 text-gray-500" />
                Destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="e.g. Tokyo, Japan"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1.5 text-gray-500" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                  {tripDays && <span className="ml-2 text-xs text-indigo-400">{tripDays}d</span>}
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || today}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                <Users className="w-4 h-4 inline mr-1.5 text-gray-500" />
                Travelers
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setTravelers(Math.max(1, travelers - 1))}
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-xl font-light text-gray-300 transition"
                >−</button>
                <span className="text-2xl font-bold w-8 text-center text-gray-100">{travelers}</span>
                <button
                  type="button"
                  onClick={() => setTravelers(travelers + 1)}
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-xl font-light text-gray-300 transition"
                >+</button>
                <span className="text-gray-400 text-sm">{travelers === 1 ? 'traveler' : 'travelers'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Interests & Budget ── */}
        {step === 2 && (
          <div className="space-y-7">
            <div>
              <h2 className="text-2xl font-bold text-gray-100 mb-1">What's your style?</h2>
              <p className="text-gray-400">Pick interests and set your total budget.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Interests <span className="text-gray-500">(select all that apply)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INTERESTS.map(({ id, label, emoji }) => {
                  const selected = interests.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleInterest(id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all text-left ${
                        selected
                          ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-200'
                          : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-gray-200'
                      }`}
                    >
                      <span className="text-base">{emoji}</span>
                      <span className="flex-1 leading-tight">{label}</span>
                      {selected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1.5 text-gray-500" />
                Total Budget (all travelers)
              </label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-gray-100 focus:outline-none focus:border-indigo-500 transition"
                >
                  {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={budget}
                  min={100}
                  step={100}
                  onChange={e => setBudget(Number(e.target.value))}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
              <div className="flex gap-2 mt-2.5">
                {BUDGET_PRESETS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBudget(v)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition ${
                      budget === v
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                        : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    ${(v / 1000).toFixed(0) + (v >= 1000 ? 'k' : '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Context (optional) ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-100 mb-1">Anything to add?</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Give the AI extra context for a more personalised trip. Fully optional.
                </p>
              </div>
              <button
                onClick={() => setStep(4)}
                className="shrink-0 text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 mt-1 transition"
              >
                Skip
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                📝 Notes
              </label>
              <textarea
                value={contextText}
                onChange={e => setContextText(e.target.value)}
                rows={4}
                placeholder={`e.g. "I'm celebrating my anniversary, I have a hotel booked near the Eiffel Tower, I'm vegetarian, I can't do early mornings…"`}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none text-sm leading-relaxed"
              />
              <p className="text-xs text-gray-600 mt-1">
                Saved with the trip — used by AI whenever you generate the itinerary or packing list.
              </p>
            </div>

            {/* File / image upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">
                  📎 Files &amp; Images
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {contextFiles.length}/{MAX_FILES}
                  </span>
                </label>
                {!hasClaudeKey && (
                  <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Images &amp; PDFs need Claude key
                  </span>
                )}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setFileDragOver(true); }}
                onDragLeave={() => setFileDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setFileDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center gap-2 cursor-pointer transition ${
                  fileDragOver
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : contextFiles.length >= MAX_FILES
                      ? 'border-gray-800 opacity-50 cursor-not-allowed'
                      : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_EXT}
                  onChange={e => e.target.files && addFiles(e.target.files)}
                  className="hidden"
                  disabled={contextFiles.length >= MAX_FILES}
                />
                <Upload className="w-6 h-6 text-gray-500" />
                <p className="text-sm text-gray-400 text-center">
                  Drop files here or <span className="text-indigo-400">browse</span>
                </p>
                <p className="text-xs text-gray-600 text-center">
                  JPG · PNG · WEBP · GIF · PDF · TXT · MD · Max 4 MB each
                </p>
              </div>

              {fileError && (
                <p className="text-xs text-red-400 mt-2">{fileError}</p>
              )}

              {/* File previews */}
              {contextFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {contextFiles.map(f => (
                    f.previewUrl ? (
                      /* Image thumbnail */
                      <div key={f.id} className="relative group">
                        <img
                          src={f.previewUrl}
                          alt={f.name}
                          className="w-20 h-20 object-cover rounded-xl border border-gray-700"
                        />
                        <button
                          onClick={() => removeFile(f.id)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 border border-gray-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-500/20 hover:border-red-500/50"
                        >
                          <X className="w-3 h-3 text-gray-300" />
                        </button>
                        <p className="text-[10px] text-gray-500 mt-1 truncate w-20 text-center">{fmtSize(f.size)}</p>
                      </div>
                    ) : (
                      /* Document chip */
                      <div key={f.id} className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 max-w-[220px]">
                        {f.mimeType === 'application/pdf'
                          ? <FileText className="w-4 h-4 text-red-400 shrink-0" />
                          : <Image className="w-4 h-4 text-blue-400 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 truncate">{f.name}</p>
                          <p className="text-[10px] text-gray-600">{fmtSize(f.size)}</p>
                        </div>
                        <button
                          onClick={() => removeFile(f.id)}
                          className="shrink-0 p-0.5 text-gray-600 hover:text-gray-300 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* API key note for images/PDFs */}
              {contextFiles.some(f => f.mimeType.startsWith('image/') || f.mimeType === 'application/pdf') && !hasClaudeKey && (
                <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                  <span className="text-base shrink-0">⚠️</span>
                  <p className="text-xs text-amber-300 leading-relaxed">
                    Images and PDFs will be ignored — add a Claude API key in Settings to enable vision analysis.
                    Text notes and .txt/.md files still work.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Create ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-100 mb-1">Ready to create!</h2>
              <p className="text-gray-400">
                AI will generate your trip name, description, and set up the foundation for your itinerary.
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                  <Plane className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-100">{destination}</p>
                  <p className="text-sm text-gray-400">
                    {new Date(startDate).toLocaleDateString('en', { month: 'long', day: 'numeric' })} –{' '}
                    {new Date(endDate).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {tripDays && <span className="ml-1.5 text-gray-500">({tripDays} days)</span>}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-800/60 rounded-xl p-3">
                  <p className="text-gray-500 text-xs mb-1">Travelers</p>
                  <p className="font-medium text-gray-200">{travelers} {travelers === 1 ? 'person' : 'people'}</p>
                </div>
                <div className="bg-gray-800/60 rounded-xl p-3">
                  <p className="text-gray-500 text-xs mb-1">Budget</p>
                  <p className="font-medium text-gray-200">{currency} {budget.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map(id => {
                    const item = INTERESTS.find(i => i.id === id);
                    return item ? (
                      <span key={id} className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-2.5 py-1 rounded-full">
                        {item.emoji} {item.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Context summary */}
              {(contextText || contextFiles.length > 0) && (
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 mb-2">Context added</p>
                  <div className="space-y-1.5">
                    {contextText && (
                      <p className="text-xs text-gray-400 bg-gray-800/60 rounded-lg px-3 py-2 line-clamp-2">
                        📝 {contextText}
                      </p>
                    )}
                    {contextFiles.length > 0 && (
                      <p className="text-xs text-gray-400 bg-gray-800/60 rounded-lg px-3 py-2">
                        📎 {contextFiles.length} file{contextFiles.length !== 1 ? 's' : ''}: {contextFiles.map(f => f.name).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* No AI key warning */}
            {!hasAiKey && (
              <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <p className="text-sm text-amber-300">
                  A Perplexity or Claude API key is required to create trips with AI.
                </p>
                <button
                  onClick={onSettingsClick}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Set up
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
                <strong>Error:</strong> {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !hasAiKey}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center justify-center gap-2.5 transition shadow-lg shadow-indigo-900/30 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI is crafting your trip…
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Trip with AI
                </>
              )}
            </button>
          </div>
        )}

        {/* Next / Back nav (steps 1–3) */}
        {step < 4 && (
          <div className="flex justify-between mt-10">
            {step > 1 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 py-2.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-xl transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !canNext1 : step === 2 ? !canNext2 : false}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-medium transition"
            >
              {step === 3 ? 'Review' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
