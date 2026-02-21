import { useState } from 'react';
import { Key, ExternalLink, Plane, LogOut, Loader2 } from 'lucide-react';

interface Props {
  onSave: (key: string) => void;
  existing: string;
  onLogout: () => void;
  onDeleteAccount: (password: string) => Promise<void>;
}

export default function ApiKeyModal({ onSave, existing, onLogout, onDeleteAccount }: Props) {
  const [key, setKey]   = useState(existing);
  const [error, setError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword]       = useState('');
  const [deleteError, setDeleteError]             = useState('');
  const [deleting, setDeleting]                   = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError('Please enter your API key');
      return;
    }
    if (!trimmed.startsWith('pplx-')) {
      setError('API key should start with pplx-');
      return;
    }
    onSave(trimmed);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await onDeleteAccount(deletePassword);
      // Component unmounts as user becomes null
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
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            <Plane className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">Wandr</h1>
            <p className="text-xs text-indigo-400">AI Trip Planner</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-800 rounded-lg">
            <Key className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-100">Connect your AI</h2>
            <p className="text-sm text-gray-400">Enter your Perplexity API key to get started</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={key}
              onChange={e => {
                setKey(e.target.value);
                setError('');
              }}
              placeholder="pplx-..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono text-sm"
              autoFocus
            />
            {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
            <p className="mt-2 text-xs text-gray-500">
              Stored securely in your account. Never sent anywhere except Perplexity.
            </p>
          </div>

          <a
            href="https://www.perplexity.ai/settings/api"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Get your key from Perplexity
          </a>

          <button
            type="submit"
            disabled={!key.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-medium transition shadow-lg shadow-indigo-900/30"
          >
            Start Planning
          </button>
        </form>

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
