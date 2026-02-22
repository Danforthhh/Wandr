export type TripStatus = 'planning' | 'upcoming' | 'completed';

export interface Trip {
  id: string;
  name: string;
  destination: string;
  country: string;
  emoji: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  interests: string[];
  description: string;
  itinerary: ItineraryDay[];
  packingList: PackingItem[];
  status: TripStatus;
  coverGradient: string;
  createdAt: string;
}

export interface ItineraryDay {
  id: string;
  date: string;
  title: string;
  activities: Activity[];
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  category: 'accommodation' | 'transport' | 'food' | 'activity' | 'sightseeing' | 'free';
  estimatedCost: number;
  lat?: number;
  lng?: number;
}

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  packed: boolean;
  quantity: number;
  essential: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type View = 'dashboard' | 'wizard' | 'detail';
export type DetailTab = 'overview' | 'itinerary' | 'packing' | 'chat' | 'map' | 'search';
