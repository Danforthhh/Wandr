import { useState } from 'react';
import { Key, ExternalLink, Plane } from 'lucide-react';

interface Props {
  onSave: (key: string) => void;
  existing: string;
}

export default function ApiKeyModal({ onSave, existing }: Props) {
  const [key, setKey] = useState(existing);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError('Please enter your API key');
      return;
    }
    if (!trimmed.startsWith('sk-ant-')) {
      setError('API key should start with sk-ant-');
      return;
    }
    onSave(trimmed);
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
            <p className="text-sm text-gray-400">Enter your Anthropic API key to get started</p>
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
              placeholder="sk-ant-api03-..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono text-sm"
              autoFocus
            />
            {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
            <p className="mt-2 text-xs text-gray-500">
              Stored locally in your browser. Never sent anywhere except Anthropic.
            </p>
          </div>

          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Get your key from Anthropic Console
          </a>

          <button
            type="submit"
            disabled={!key.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-medium transition shadow-lg shadow-indigo-900/30"
          >
            Start Planning
          </button>
        </form>
      </div>
    </div>
  );
}
