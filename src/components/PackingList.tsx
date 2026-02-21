import { useState } from 'react';
import { Loader2, Sparkles, Check, AlertCircle, Lock, Settings } from 'lucide-react';
import { Trip, PackingItem } from '../types';

const CATEGORY_EMOJI: Record<string, string> = {
  Documents: '📄',
  Clothing: '👕',
  Toiletries: '🧴',
  Electronics: '🔌',
  'Health & Safety': '💊',
  Activities: '🎒',
  Miscellaneous: '📦',
};

interface Props {
  trip: Trip;
  onGenerate: (trip: Trip) => Promise<Trip>;
  onUpdate: (trip: Trip) => void;
  hasAiKey: boolean;
  onSettingsClick: () => void;
}

export default function PackingList({ trip, onGenerate, onUpdate, hasAiKey, onSettingsClick }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      await onGenerate(trip);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate packing list');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    onUpdate({
      ...trip,
      packingList: trip.packingList.map(item =>
        item.id === id ? { ...item, packed: !item.packed } : item
      ),
    });
  };

  const packAll = () => {
    onUpdate({
      ...trip,
      packingList: trip.packingList.map(item => ({ ...item, packed: true })),
    });
  };

  const unpackAll = () => {
    onUpdate({
      ...trip,
      packingList: trip.packingList.map(item => ({ ...item, packed: false })),
    });
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (trip.packingList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-5">
          <span className="text-3xl">🧳</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-200 mb-2">No packing list yet</h3>
        <p className="text-gray-500 max-w-sm mb-6 leading-relaxed">
          {hasAiKey
            ? 'AI will create a smart, categorized packing list tailored to your destination, activities, and trip duration.'
            : 'Set up your Perplexity API key to generate a smart packing list with AI.'}
        </p>
        {error && (
          <div className="mb-5 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 max-w-sm">
            {error}
          </div>
        )}
        {hasAiKey ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl font-medium transition"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Generating packing list…' : 'Generate Packing List'}
          </button>
        ) : (
          <button
            onClick={onSettingsClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition"
          >
            <Settings className="w-4 h-4" />
            Set up AI in Settings
          </button>
        )}
      </div>
    );
  }

  const packed = trip.packingList.filter(i => i.packed).length;
  const total = trip.packingList.length;
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

  const categories = [...new Set(trip.packingList.map(i => i.category))];

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-200">Packing Progress</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {packed} of {total} items packed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={unpackAll}
              className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
            >
              Unpack all
            </button>
            <button
              onClick={packAll}
              className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
            >
              Pack all
            </button>
          </div>
        </div>

        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">{pct}% packed</span>
          {pct === 100 && (
            <span className="text-xs text-emerald-400 font-medium">All packed! ✓</span>
          )}
          {/* Regenerate button — greyed out if no key */}
          {hasAiKey ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="text-xs text-gray-500 hover:text-indigo-400 flex items-center gap-1 transition"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Regenerate
            </button>
          ) : (
            <button
              onClick={onSettingsClick}
              className="text-xs text-gray-700 hover:text-gray-500 flex items-center gap-1 transition"
              title="Set up Perplexity key to regenerate"
            >
              <Lock className="w-3 h-3" />
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Essential items reminder */}
      {(() => {
        const unpacked = trip.packingList.filter(i => i.essential && !i.packed);
        return unpacked.length > 0 ? (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">
                {unpacked.length} essential item{unpacked.length !== 1 ? 's' : ''} not packed
              </p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                {unpacked.slice(0, 3).map(i => i.name).join(', ')}
                {unpacked.length > 3 ? ` and ${unpacked.length - 3} more` : ''}
              </p>
            </div>
          </div>
        ) : null;
      })()}

      {/* Categories */}
      {categories.map(category => {
        const items = trip.packingList.filter(i => i.category === category);
        const catPacked = items.filter(i => i.packed).length;
        const emoji = CATEGORY_EMOJI[category] ?? '📦';

        return (
          <div key={category} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{emoji}</span>
                <h4 className="font-medium text-gray-300 text-sm">{category}</h4>
              </div>
              <span className="text-xs text-gray-500">
                {catPacked}/{items.length}
              </span>
            </div>

            <div className="divide-y divide-gray-800/50">
              {items.map((item: PackingItem) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-800/50 transition text-left"
                >
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      item.packed
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {item.packed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>

                  {/* Label */}
                  <span
                    className={`flex-1 text-sm transition-colors ${
                      item.packed ? 'text-gray-600 line-through' : 'text-gray-200'
                    }`}
                  >
                    {item.name}
                  </span>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.quantity > 1 && (
                      <span className="text-xs text-gray-500">×{item.quantity}</span>
                    )}
                    {item.essential && !item.packed && (
                      <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        essential
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
