import { useState } from 'react';
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
} from 'lucide-react';
import { Trip } from '../types';

const INTERESTS = [
  { id: 'culture', label: 'Culture & History', emoji: '🏛️' },
  { id: 'food', label: 'Food & Dining', emoji: '🍜' },
  { id: 'nature', label: 'Nature & Outdoors', emoji: '🏔️' },
  { id: 'adventure', label: 'Adventure', emoji: '🧗' },
  { id: 'beach', label: 'Beach & Relaxation', emoji: '🏖️' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🎭' },
  { id: 'photography', label: 'Photography', emoji: '📸' },
  { id: 'family', label: 'Family-Friendly', emoji: '👨‍👩‍👧' },
  { id: 'luxury', label: 'Luxury', emoji: '✨' },
  { id: 'backpacking', label: 'Budget Travel', emoji: '🎒' },
  { id: 'wellness', label: 'Wellness & Spa', emoji: '🧘' },
];

const BUDGET_PRESETS = [500, 1500, 3000, 5000, 10000];

interface CreateParams {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  interests: string[];
}

interface Props {
  onBack: () => void;
  onCreate: (params: CreateParams) => Promise<Trip>;
  hasAiKey: boolean;
  onSettingsClick: () => void;
}

export default function TripWizard({ onBack, onCreate, hasAiKey, onSettingsClick }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState(2);

  // Step 2
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState(3000);
  const [currency, setCurrency] = useState('USD');

  const today = new Date().toISOString().split('T')[0];

  const canNext1 =
    destination.trim() !== '' &&
    startDate !== '' &&
    endDate !== '' &&
    new Date(endDate) >= new Date(startDate);
  const canNext2 = interests.length > 0 && budget > 0;

  const toggleInterest = (id: string) =>
    setInterests(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      await onCreate({ destination, startDate, endDate, travelers, budget, currency, interests });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create trip';
      setError(msg);
      setLoading(false);
    }
  };

  const tripDays =
    startDate && endDate
      ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1
      : null;

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
            <p className="text-xs text-gray-500">Step {step} of 3</p>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1.5 w-10 rounded-full transition-colors duration-300 ${
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

            {/* Destination */}
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

            {/* Dates */}
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
                  {tripDays && (
                    <span className="ml-2 text-xs text-indigo-400">{tripDays}d</span>
                  )}
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

            {/* Travelers */}
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
                >
                  −
                </button>
                <span className="text-2xl font-bold w-8 text-center text-gray-100">{travelers}</span>
                <button
                  type="button"
                  onClick={() => setTravelers(travelers + 1)}
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-xl font-light text-gray-300 transition"
                >
                  +
                </button>
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

            {/* Interests */}
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

            {/* Budget */}
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
                    ${(v / 1000).toFixed(v < 1000 ? 0 : 0) + (v >= 1000 ? 'k' : '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Create ── */}
        {step === 3 && (
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
                      <span
                        key={id}
                        className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-2.5 py-1 rounded-full"
                      >
                        {item.emoji} {item.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            {/* No AI key warning */}
            {!hasAiKey && (
              <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <p className="text-sm text-amber-300">
                  A Perplexity API key is required to create trips with AI.
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

        {/* Next button (steps 1–2) */}
        {step < 3 && (
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
              disabled={step === 1 ? !canNext1 : !canNext2}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-medium transition"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
