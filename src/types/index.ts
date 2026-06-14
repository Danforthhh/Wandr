export type TripStatus = 'planning' | 'upcoming' | 'completed';

export interface TripContextFile {
  id: string;
  name: string;
  mimeType: string;
  dataBase64: string;
  previewUrl?: string;
  size: number;
}

export interface TripContext {
  text?: string;
  files?: TripContextFile[];
}

export interface FlightInfo {
  flightNumber: string;
  departureAirport: string;
  departureDate: string;  // YYYY-MM-DD (may differ from startDate)
  departureTime: string;  // HH:MM local
  arrivalAirport: string;
  arrivalTime: string;    // HH:MM local at destination
}

export interface MustDo {
  city: string;
  items: string[];
}

export interface TripStop {
  city: string;
  nights: number;
}

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
  notes?: string;
  mustDos?: MustDo[];
  outboundFlight?: FlightInfo;
  plannedStops?: TripStop[];
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
  location?: string;
  activities: Activity[];
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  category: 'accommodation' | 'transport' | 'food' | 'activity' | 'sightseeing' | 'free' | 'reservation';
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

export interface Session {
  uid: string;
  email: string;
}

export interface EncryptedKeyBundle {
  encryptedKey: string;
  keySalt: string;
  keyIv: string;
}
