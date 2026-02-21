import { useState, useEffect } from 'react';
import { Trip, View, DetailTab, ChatMessage } from './types';
import { getTrips, saveTrips, getChats, saveChats } from './services/storage';
import { generateTripDetails, generateItinerary, generatePackingList } from './services/ai';
import ApiKeyModal from './components/ApiKeyModal';
import Dashboard from './components/Dashboard';
import TripWizard from './components/TripWizard';
import TripDetail from './components/TripDetail';
import ActivityLog from './components/ActivityLog';

function nanoid(): string {
  return Math.random().toString(36).slice(2, 11);
}

export default function App() {
  const [trips, setTrips]               = useState<Trip[]>([]);
  const [view, setView]                 = useState<View>('dashboard');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab]       = useState<DetailTab>('overview');
  const [apiKey, setApiKey]             = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    setTrips(getTrips());
    const stored = localStorage.getItem('wandr_api_key') ?? '';
    setApiKey(stored);
    if (!stored) setShowKeyModal(true);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const persistTrips = (updated: Trip[]) => {
    setTrips(updated);
    saveTrips(updated);
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('wandr_api_key', key);
    setShowKeyModal(false);
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
  }): Promise<Trip> => {
    const details = await generateTripDetails({ ...params, apiKey });

    const trip: Trip = {
      id:       nanoid(),
      name:     details.name,
      emoji:    details.emoji,
      description:    details.description,
      coverGradient:  details.coverGradient,
      destination:    params.destination,
      country:        params.destination.split(',').pop()?.trim() ?? params.destination,
      startDate:      params.startDate,
      endDate:        params.endDate,
      travelers:      params.travelers,
      budget:         params.budget,
      currency:       params.currency,
      interests:      params.interests,
      itinerary:      [],
      packingList:    [],
      status:         'planning',
      createdAt:      new Date().toISOString(),
    };

    persistTrips([...trips, trip]);
    setSelectedTrip(trip);
    setActiveTab('overview');
    setView('detail');
    return trip;
  };

  const handleUpdateTrip = (updated: Trip) => {
    const list = trips.map(t => (t.id === updated.id ? updated : t));
    setSelectedTrip(updated);
    persistTrips(list);
  };

  const handleDeleteTrip = (id: string) => {
    persistTrips(trips.filter(t => t.id !== id));
    setView('dashboard');
    setSelectedTrip(null);
  };

  // ── AI generation ──────────────────────────────────────────────────────────

  const handleGenerateItinerary = async (trip: Trip): Promise<Trip> => {
    const itinerary = await generateItinerary(trip, apiKey);
    const updated = { ...trip, itinerary };
    handleUpdateTrip(updated);
    return updated;
  };

  const handleGeneratePackingList = async (trip: Trip): Promise<Trip> => {
    const packingList = await generatePackingList(trip, apiKey);
    const updated = { ...trip, packingList };
    handleUpdateTrip(updated);
    return updated;
  };

  // ── Chat history ───────────────────────────────────────────────────────────

  const getChatHistory    = (tripId: string): ChatMessage[] => getChats(tripId);
  const saveChatHistory   = (tripId: string, msgs: ChatMessage[]) => saveChats(tripId, msgs);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <ActivityLog />
      {showKeyModal && (
        <ApiKeyModal onSave={handleSaveApiKey} existing={apiKey} />
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
        />
      )}

      {view === 'wizard' && (
        <TripWizard
          onBack={() => setView('dashboard')}
          onCreate={handleCreateTrip}
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
          apiKey={apiKey}
        />
      )}
    </div>
  );
}
