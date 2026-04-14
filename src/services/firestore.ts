import {
  doc, collection,
  getDoc, getDocs, setDoc, deleteDoc, writeBatch,
  updateDoc, deleteField,
  query, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, ChatMessage, EncryptedKeyBundle } from '../types';

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

// ── Encrypted key bundles ─────────────────────────────────────────────────────
// Two keys: 'claude' (Anthropic) and 'perplexity'.
// Path: users/{uid}/settings/main — merged into the existing settings doc.
// Field layout:
//   claude      → claudeEncKey / claudeSalt / claudeIv
//   perplexity  → pplxEncKey   / pplxSalt   / pplxIv

export type { EncryptedKeyBundle };

export type KeyType = 'claude' | 'perplexity';

function keyFields(type: KeyType) {
  return type === 'claude'
    ? { enc: 'claudeEncKey', salt: 'claudeSalt', iv: 'claudeIv' }
    : { enc: 'pplxEncKey',   salt: 'pplxSalt',   iv: 'pplxIv'  };
}

export async function getEncryptedKey(uid: string, type: KeyType): Promise<EncryptedKeyBundle | null> {
  const snap = await getDoc(settingsDoc(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const f = keyFields(type);
  if (typeof data[f.enc] !== 'string' || !data[f.enc]) return null;
  return { encryptedKey: data[f.enc], keySalt: data[f.salt], keyIv: data[f.iv] };
}

export async function saveEncryptedKey(uid: string, type: KeyType, bundle: EncryptedKeyBundle): Promise<void> {
  const f = keyFields(type);
  await setDoc(settingsDoc(uid), {
    [f.enc]:  bundle.encryptedKey,
    [f.salt]: bundle.keySalt,
    [f.iv]:   bundle.keyIv,
  }, { merge: true });
}

export async function removeEncryptedKey(uid: string, type: KeyType): Promise<void> {
  const f = keyFields(type);
  // Use setDoc+merge instead of updateDoc so this never throws if the doc doesn't exist
  await setDoc(settingsDoc(uid), {
    [f.enc]:  deleteField(),
    [f.salt]: deleteField(),
    [f.iv]:   deleteField(),
  }, { merge: true });
}
