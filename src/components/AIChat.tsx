import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Bot, User, Trash2, Lock, Settings } from 'lucide-react';
import { Trip, ChatMessage } from '../types';
import { chatAboutTrip } from '../services/ai';

interface Props {
  trip: Trip;
  perplexityKey: string;
  hasAiKey: boolean;
  onSettingsClick: () => void;
  getChatHistory: (tripId: string) => Promise<ChatMessage[]>;
  saveChatHistory: (tripId: string, messages: ChatMessage[]) => Promise<void>;
}

const QUICK_PROMPTS = [
  'What are the must-try local foods?',
  'Best way to get around the city?',
  'What should I know about local customs?',
  'Hidden gems most tourists miss?',
  'Best time of day to visit popular sites?',
  'Safety tips for this destination?',
];

function nanoid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function AIChat({ trip, perplexityKey, hasAiKey, onSettingsClick, getChatHistory, saveChatHistory }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getChatHistory(trip.id).then(history => {
      if (!cancelled) setMessages(history);
    });
    return () => { cancelled = true; };
  }, [trip.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setInput('');
    setLoading(true);
    inputRef.current?.focus();

    try {
      const history = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const reply = await chatAboutTrip(text.trim(), history, trip, perplexityKey);

      const aiMsg: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      const final = [...withUser, aiMsg];
      setMessages(final);
      await saveChatHistory(trip.id, final);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      const errMsg: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: `Sorry, I ran into an error: ${msg}`,
        timestamp: new Date().toISOString(),
      };
      const final = [...withUser, errMsg];
      setMessages(final);
      await saveChatHistory(trip.id, final);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (confirm('Clear chat history?')) {
      setMessages([]);
      await saveChatHistory(trip.id, []);
    }
  };

  // ── Locked state ─────────────────────────────────────────────────────────
  if (!hasAiKey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center mb-5">
          <Lock className="w-7 h-7 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">AI Chat unavailable</h3>
        <p className="text-gray-600 max-w-sm mb-6 leading-relaxed text-sm">
          Add your Perplexity API key to chat with an AI assistant about your trip to {trip.destination}.
        </p>
        <button
          onClick={onSettingsClick}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition"
        >
          <Settings className="w-4 h-4" />
          Set up in Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 300px)', minHeight: '280px' }}>
      {/* Chat header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-sm font-medium text-gray-300">AI Travel Assistant</span>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Online</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-1.5 text-gray-600 hover:text-gray-400 hover:bg-gray-800 rounded-lg transition"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center pt-6 pb-4">
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-3">
              <Bot className="w-7 h-7 text-indigo-400" />
            </div>
            <p className="font-medium text-gray-300 mb-1">Ask me anything about {trip.destination}</p>
            <p className="text-sm text-gray-500 mb-5 max-w-sm">
              I know your trip details, interests, and budget. Let me help you plan the perfect experience.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-sm text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 px-3 py-1.5 rounded-full transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === 'assistant' ? 'bg-indigo-500/20' : 'bg-gray-700'
              }`}
            >
              {msg.role === 'assistant' ? (
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-gray-300" />
              )}
            </div>
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-gray-800">
        <form
          onSubmit={e => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Ask about ${trip.destination}...`}
            disabled={loading}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition shrink-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
