import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Bot, User, Trash2, Lock, Settings, Paperclip, X, FileText } from 'lucide-react';
import { Trip, ChatMessage, TripContextFile } from '../types';
import { chatAboutTrip } from '../services/ai';

interface Props {
  trip: Trip;
  perplexityKey: string;
  anthropicKey: string;
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

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/markdown';
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

function nanoid() {
  return Math.random().toString(36).slice(2, 9);
}

async function fileToContextFile(file: File): Promise<TripContextFile | null> {
  if (file.size > MAX_SIZE) return null;
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({
        id: nanoid(),
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataBase64: base64,
        previewUrl: file.type.startsWith('image/') ? dataUrl : undefined,
        size: file.size,
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function AIChat({ trip, perplexityKey, anthropicKey, hasAiKey, onSettingsClick, getChatHistory, saveChatHistory }: Props) {
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [attachments, setAttachments] = useState<TripContextFile[]>([]);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

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

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const remaining = 3 - attachments.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const results = await Promise.all(toProcess.map(fileToContextFile));
    setAttachments(prev => [...prev, ...results.filter((f): f is TripContextFile => f !== null)]);
  };

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  const send = async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || loading) return;

    const label = attachments.length
      ? `${text.trim()}${text.trim() ? '\n' : ''}📎 ${attachments.map(a => a.name).join(', ')}`
      : text.trim();

    const userMsg: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: label,
      timestamp: new Date().toISOString(),
    };

    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setInput('');
    const sentAttachments = [...attachments];
    setAttachments([]);
    setLoading(true);
    inputRef.current?.focus();

    try {
      const history = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const reply = await chatAboutTrip(
        text.trim() || '(see attached file)',
        history,
        trip,
        perplexityKey,
        anthropicKey,
        sentAttachments.length ? sentAttachments : undefined
      );

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
          {anthropicKey && (
            <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full">Vision</span>
          )}
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
              I know your trip details, interests, and budget.
              {anthropicKey ? ' Attach images or files for visual help.' : ' Let me help you plan the perfect experience.'}
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

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 pt-3 flex-wrap">
          {attachments.map(a => (
            <div key={a.id} className="relative group">
              {a.previewUrl ? (
                <img
                  src={a.previewUrl}
                  alt={a.name}
                  className="w-14 h-14 rounded-lg object-cover border border-gray-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg border border-gray-700 bg-gray-800 flex flex-col items-center justify-center gap-1 px-1">
                  <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-[9px] text-gray-500 truncate w-full text-center">{a.name}</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(a.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-900 border border-gray-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-2.5 h-2.5 text-gray-300" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="pt-3 border-t border-gray-800 mt-3">
        {/* hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={e => addFiles(e.target.files)}
          onClick={e => { (e.target as HTMLInputElement).value = ''; }}
        />
        <form
          onSubmit={e => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          {/* Attach button — only shown when Claude key present */}
          {anthropicKey && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading || attachments.length >= 3}
              title="Attach image or file (max 3)"
              className="p-3 text-gray-500 hover:text-indigo-400 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={attachments.length ? 'Add a message or just send the file…' : `Ask about ${trip.destination}...`}
            disabled={loading}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || loading}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition shrink-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
