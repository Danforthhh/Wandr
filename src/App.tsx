import { useState, useEffect } from 'react';
import { signOut, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Trip, View, DetailTab, ChatMessage, TripContext } from './types';
import { auth } from './services/firebase';
import { useAuth } from './hooks/useAuth';
import {
  getTrips, saveTrip, deleteTrip as firestoreDeleteTrip,
  getChats, saveChats,
  getApiKeys, saveApiKeys, ApiKeys,
  deleteAllUserData,
} from './services/firestore';
import { generateTripDetails, generateItinerary, generatePackingList } from './services/ai';
import AuthPage from './components/AuthPage';
import ApiKeyModal from './components/ApiKeyModal';
import Dashboard from './components/Dashboard';
import TripWizard from './components/TripWizard';
import TripDetail from './components/TripDetail';
import ActivityLog from './components/ActivityLog';
import DebugPanel from './components/DebugPanel';

function nanoid(): string {
  return Math.random().toString(36).slice(2, 11);
}

export default function App() {
  const { user, loading: authLoading } = useAuth();

  const [trips, setTrips]               = useState<Trip[]>([]);
  const [view, setView]                 = useState<View>('dashboard');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab]       = useState<DetailTab>('overview');
  const [perplexityKey, setPerplexityKey] = useState('');
  const [anthropicKey, setAnthropicKey]   = useState('');
  const [showKeyModal, setShowKeyModal]   = useState(false);

  // Load user data on auth
  useEffect(() => {
    if (!user) {
      setTrips([]);
      setPerplexityKey('');
      setAnthropicKey('');
      setView('dashboard');
      setSelectedTrip(null);
      return;
    }

    let cancelled = false;
    Promise.all([
      getTrips(user.uid).catch((): Trip[] => []),
      getApiKeys(user.uid).catch(() => ({ perplexityKey: '', anthropicKey: '' })),
    ]).then(([loadedTrips, loadedKeys]) => {
      if (cancelled) return;
      setTrips(loadedTrips);
      setPerplexityKey(loadedKeys.perplexityKey);
      setAnthropicKey(loadedKeys.anthropicKey);
    });
    return () => { cancelled = true; };
  }, [user]);

  // ── API keys ─────────────────────────────────────────────────────────────────

  const handleSaveApiKeys = async (keys: ApiKeys) => {
    setPerplexityKey(keys.perplexityKey);
    setAnthropicKey(keys.anthropicKey);
    if (user) await saveApiKeys(user.uid, keys);
  };

  // ── Auth ─────────────────────────────────────────────────────────────────────

  const handleLogout = () => signOut(auth);

  const handleDeleteAccount = async (password: string) => {
    if (!user?.email) return;
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    await deleteAllUserData(user.uid);
    await deleteUser(user);
  };

  // ── Trip CRUD ──────────────────────────────────────────────────────────────

  const handleCreateTrip = async (params: {
    destination: string;
    startDate: string;
    endDate: string;
    travelers: number;
    budget: number;
    currency: string;
    interests: string[];
    context?: TripContext;
  }): Promise<Trip> => {
    const details = await generateTripDetails({
      ...params, anthropicKey, context: params.context,
    });

    const trip: Trip = {
      id:            nanoid(),
      name:          details.name,
      emoji:         details.emoji,
      description:   details.description,
      coverGradient: details.coverGradient,
      destination:   params.destination,
      country:       params.destination.split(',').pop()?.trim() ?? params.destination,
      startDate:     params.startDate,
      endDate:       params.endDate,
      travelers:     params.travelers,
      budget:        params.budget,
      currency:      params.currency,
      interests:     params.interests,
      notes:         params.context?.text || undefined,
      itinerary:     [],
      packingList:   [],
      status:        'planning',
      createdAt:     new Date().toISOString(),
    };

    setTrips(prev => [...prev, trip]);
    setSelectedTrip(trip);
    setActiveTab('overview');
    setView('detail');
    if (user) await saveTrip(user.uid, trip);
    return trip;
  };

  const handleUpdateTrip = async (updated: Trip) => {
    setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTrip(updated);
    if (user) await saveTrip(user.uid, updated);
  };

  const handleDeleteTrip = async (id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));
    setView('dashboard');
    setSelectedTrip(null);
    if (user) await firestoreDeleteTrip(user.uid, id);
  };

  // ── AI generation ──────────────────────────────────────────────────────────

  const handleGenerateItinerary = async (trip: Trip): Promise<Trip> => {
    const itinerary = await generateItinerary(trip, anthropicKey);
    const updated = { ...trip, itinerary };
    await handleUpdateTrip(updated);
    return updated;
  };

  const handleGeneratePackingList = async (trip: Trip): Promise<Trip> => {
    const packingList = await generatePackingList(trip, anthropicKey);
    const updated = { ...trip, packingList };
    await handleUpdateTrip(updated);
    return updated;
  };

  // ── Chat history ───────────────────────────────────────────────────────────

  const getChatHistory = (tripId: string): Promise<ChatMessage[]> =>
    user ? getChats(user.uid, tripId) : Promise.resolve([]);

  const saveChatHistory = (tripId: string, messages: ChatMessage[]): Promise<void> =>
    user ? saveChats(user.uid, tripId, messages) : Promise.resolve();

  // ── Render ─────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  // Generation (trip details, itinerary, packing) uses Claude only
  const hasGenerationKey = !!anthropicKey;
  // Search and chat use Perplexity for real-time web data
  const hasSearchKey = !!perplexityKey;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <ActivityLog />
      <DebugPanel />
      {showKeyModal && (
        <ApiKeyModal
          onSave={handleSaveApiKeys}
          existing={{ perplexityKey, anthropicKey }}
          onClose={() => setShowKeyModal(false)}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      )}

      {view === 'dashboard' && (
        <Dashboard
          trips={trips}
          onNewTrip={() => setView('wizard')}
          onSelectTrip={trip => {
            setSelectedTrip(trip);
            setActiveTab('overview');
            setView('detail');
          }}
          onSettingsClick={() => setShowKeyModal(true)}
          hasAiKey={hasGenerationKey}
        />
      )}

      {view === 'wizard' && (
        <TripWizard
          onBack={() => setView('dashboard')}
          onCreate={handleCreateTrip}
          hasAiKey={hasGenerationKey}
          hasClaudeKey={!!anthropicKey}
          onSettingsClick={() => setShowKeyModal(true)}
        />
      )}

      {view === 'detail' && selectedTrip && (
        <TripDetail
          trip={selectedTrip}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onBack={() => setView('dashboard')}
          onDelete={handleDeleteTrip}
          onGenerateItinerary={handleGenerateItinerary}
          onGeneratePackingList={handleGeneratePackingList}
          onUpdateTrip={handleUpdateTrip}
          getChatHistory={getChatHistory}
          saveChatHistory={saveChatHistory}
          perplexityKey={perplexityKey}
          anthropicKey={anthropicKey}
          hasGenerationKey={hasGenerationKey}
          hasSearchKey={hasSearchKey}
          onSettingsClick={() => setShowKeyModal(true)}
        />
      )}
    </div>
  );
}
