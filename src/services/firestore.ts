import {
  doc, collection,
  getDoc, getDocs, setDoc, deleteDoc, writeBatch,
  query, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, ChatMessage } from '../types';

// ── Path helpers ──────────────────────────────────────────────────────────────

function tripsCol(uid: string) {
  return collection(db, 'users', uid, 'trips');
}
function tripDoc(uid: string, tripId: string) {
  return doc(db, 'users', uid, 'trips', tripId);
}
function chatDoc(uid: string, tripId: string) {
  return doc(db, 'users', uid, 'chats', tripId);
}
function chatsCol(uid: string) {
  return collection(db, 'users', uid, 'chats');
}
function settingsDoc(uid: string) {
  return doc(db, 'users', uid, 'settings', 'main');
}

// ── Trips ─────────────────────────────────────────────────────────────────────

export async function getTrips(uid: string): Promise<Trip[]> {
  const snap = await getDocs(query(tripsCol(uid), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => d.data() as Trip);
}

export async function saveTrip(uid: string, trip: Trip): Promise<void> {
  await setDoc(tripDoc(uid, trip.id), trip);
}

export async function deleteTrip(uid: string, tripId: string): Promise<void> {
  await Promise.all([
    deleteDoc(tripDoc(uid, tripId)),
    deleteDoc(chatDoc(uid, tripId)),
  ]);
}

// ── Chats ─────────────────────────────────────────────────────────────────────

export async function getChats(uid: string, tripId: string): Promise<ChatMessage[]> {
  const snap = await getDoc(chatDoc(uid, tripId));
  if (!snap.exists()) return [];
  return (snap.data().messages ?? []) as ChatMessage[];
}

export async function saveChats(uid: string, tripId: string, messages: ChatMessage[]): Promise<void> {
  await setDoc(chatDoc(uid, tripId), { messages });
}

// ── API Key ───────────────────────────────────────────────────────────────────

export async function getApiKey(uid: string): Promise<string> {
  const snap = await getDoc(settingsDoc(uid));
  if (!snap.exists()) return '';
  return (snap.data().apiKey ?? '') as string;
}

export async function saveApiKey(uid: string, apiKey: string): Promise<void> {
  await setDoc(settingsDoc(uid), { apiKey });
}

// ── Account deletion ──────────────────────────────────────────────────────────
// Must be called BEFORE deleteUser(auth) since security rules require valid auth.

export async function deleteAllUserData(uid: string): Promise<void> {
  const batch = writeBatch(db);

  const [tripSnap, chatSnap] = await Promise.all([
    getDocs(tripsCol(uid)),
    getDocs(chatsCol(uid)),
  ]);

  tripSnap.docs.forEach(d => batch.delete(d.ref));
  chatSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(settingsDoc(uid));

  await batch.commit();
}
