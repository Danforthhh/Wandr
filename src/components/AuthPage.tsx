import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError,
} from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../services/firebase';
import { persistPassword, clearPersistedPassword } from '../services/cryptoService';
import { Plane, Mail, Lock, Loader2 } from 'lucide-react';

type Mode = 'login' | 'create';

export default function AuthPage() {
  const { t } = useTranslation('auth');
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  function friendlyError(code: string): string {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t('page.errors.invalidCredentials');
      case 'auth/email-already-in-use':
        return t('page.errors.emailExists');
      case 'auth/weak-password':
        return t('page.errors.weakPassword');
      case 'auth/invalid-email':
        return t('page.errors.invalidEmail');
      case 'auth/too-many-requests':
        return t('page.errors.tooManyAttempts');
      default:
        return t('page.errors.default');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Persist BEFORE Firebase so App.tsx useEffect finds the password when
      // onAuthStateChanged fires (which happens during the await, before it resolves).
      // Cleared in the catch block if auth fails, so no stale password is kept.
      persistPassword(password);
      if (mode === 'create') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // onAuthStateChanged in useAuth() handles the rest
    } catch (err) {
      clearPersistedPassword(); // remove the pre-persisted password on auth failure
      setError(friendlyError((err as AuthError).code));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'create' : 'login');
    setError('');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Travel photo background — Tokyo at dusk */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80&auto=format&fit=crop')" }}
      />
      <div className="absolute inset-0 bg-gray-950/80" />
      <div className="relative z-10 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            <Plane className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">{t('page.title')}</h1>
            <p className="text-xs text-indigo-400">{t('page.subtitle')}</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-100 mb-6">
          {mode === 'login' ? t('page.signInTitle') : t('page.createTitle')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">{t('page.email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder={t('page.emailPlaceholder')}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">{t('page.password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={t('page.passwordPlaceholder')}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-medium transition shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? t('page.signInBtn') : t('page.createBtn')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === 'login' ? t('page.noAccount') : t('page.hasAccount')}
          {' '}
          <button onClick={switchMode} className="text-indigo-400 hover:text-indigo-300 transition font-medium">
            {mode === 'login' ? t('page.createLink') : t('page.signInLink')}
          </button>
        </p>
      </div>
    </div>
  );
}

