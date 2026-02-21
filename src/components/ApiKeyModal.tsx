import { useState } from 'react';
import { X, Key, ExternalLink, LogOut, Loader2, Eye, EyeOff } from 'lucide-react';
import { ApiKeys } from '../services/firestore';

interface Props {
  onSave: (keys: ApiKeys) => void;
  existing: ApiKeys;
  onClose: () => void;
  onLogout: () => void;
  onDeleteAccount: (password: string) => Promise<void>;
}

export default function ApiKeyModal({ onSave, existing, onClose, onLogout, onDeleteAccount }: Props) {
  const [perplexityKey, setPerplexityKey] = useState(existing.perplexityKey);
  const [anthropicKey, setAnthropicKey]   = useState(existing.anthropicKey);
  const [showPplx, setShowPplx] = useState(false);
  const [showAnt, setShowAnt]   = useState(false);
  const [saved, setSaved] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword]       = useState('');
  const [deleteError, setDeleteError]             = useState('');
  const [deleting, setDeleting]                   = useState(false);

  const handleSave = () => {
    onSave({ perplexityKey: perplexityKey.trim(), anthropicKey: anthropicKey.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await onDeleteAccount(deletePassword);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password.');
      } else {
        setDeleteError('Failed to delete account. Please try again.');
      }
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800 rounded-lg">
              <Key className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-100">API Settings</h2>
              <p className="text-xs text-gray-500">Configure your AI provider keys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Perplexity key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Perplexity API Key
              {existing.perplexityKey && (
                <span className="ml-2 text-xs text-emerald-400">✓ configured</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPplx ? 'text' : 'password'}
                value={perplexityKey}
                onChange={e => setPerplexityKey(e.target.value)}
                placeholder="pplx-..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-10 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPplx(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showPplx ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Used for itinerary generation, packing lists, and AI chat.
            </p>
            <a
              href="https://www.perplexity.ai/settings/api"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              <ExternalLink className="w-3 h-3" />
              Get your Perplexity key
            </a>
          </div>

          {/* Anthropic key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Anthropic API Key
              {existing.anthropicKey && (
                <span className="ml-2 text-xs text-emerald-400">✓ configured</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showAnt ? 'text' : 'password'}
                value={anthropicKey}
                onChange={e => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-10 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowAnt(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showAnt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              For Claude-powered features.
            </p>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              <ExternalLink className="w-3 h-3" />
              Get your Anthropic key
            </a>
          </div>

          <button
            onClick={handleSave}
            className={`w-full py-3 rounded-xl font-medium transition shadow-lg shadow-indigo-900/30 ${
              saved
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {saved ? '✓ Saved' : 'Save Keys'}
          </button>
        </div>

        {/* Account management */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-500 hover:text-red-400 transition"
            >
              Delete account
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
              <p className="text-sm text-red-300 leading-relaxed">
                This will permanently delete all your trips, chat history, and your account.
                Enter your password to confirm.
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError(''); }}
                placeholder="Your password"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-600 text-sm focus:outline-none focus:border-red-500 transition"
              />
              {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
                  className="flex-1 py-2 text-sm text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={!deletePassword || deleting}
                  className="flex-1 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Delete everything
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
