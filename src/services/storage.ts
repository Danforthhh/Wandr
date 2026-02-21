import { Trip, ChatMessage } from '../types';

const TRIPS_KEY = 'wandr_trips';
const CHATS_PREFIX = 'wandr_chats_';

export function getTrips(): Trip[] {
  try {
    const data = localStorage.getItem(TRIPS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTrips(trips: Trip[]): void {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
}

export function getChats(tripId: string): ChatMessage[] {
  try {
    const data = localStorage.getItem(CHATS_PREFIX + tripId);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveChats(tripId: string, messages: ChatMessage[]): void {
  localStorage.setItem(CHATS_PREFIX + tripId, JSON.stringify(messages));
}
