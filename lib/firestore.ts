import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type CollectionReference,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Album, Artist, Playlist, RecentlyPlayed, Song } from '@/lib/types';

type CollectionName = 'songs' | 'artists' | 'albums' | 'playlists' | 'users' | 'favorites' | 'recentlyPlayed';

export function typedCollection<T extends DocumentData>(name: CollectionName) {
  if (!db) return undefined;
  return collection(db, name) as CollectionReference<T>;
}

export function subscribeCollection<T extends DocumentData>(
  name: CollectionName,
  constraints: QueryConstraint[],
  onData: (items: (T & { id: string })[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | undefined {
  const reference = typedCollection<T>(name);
  if (!reference) {
    onData([]);
    return undefined;
  }
  const target = constraints.length ? query(reference, ...constraints) : reference;
  return onSnapshot(
    target,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as (T & { id: string })[]),
    (error) => onError?.(error)
  );
}

export async function getDocument<T extends DocumentData>(name: CollectionName, id: string) {
  if (!db) return undefined;
  const snapshot = await getDoc(doc(db, name, id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T & { id: string }) : undefined;
}

export async function createDocument<T extends DocumentData>(name: CollectionName, data: T) {
  if (!db) throw new Error('Firebase is not configured yet. Add your Firebase environment variables.');
  return addDoc(collection(db, name), data);
}

export async function saveDocument<T extends DocumentData>(name: CollectionName, id: string, data: Partial<T>) {
  if (!db) throw new Error('Firebase is not configured yet. Add your Firebase environment variables.');
  return setDoc(doc(db, name, id) as Parameters<typeof setDoc>[0], data, { merge: true });
}

export async function updateDocument<T extends DocumentData>(name: CollectionName, id: string, data: Partial<T>) {
  if (!db) throw new Error('Firebase is not configured yet. Add your Firebase environment variables.');
  return updateDoc(doc(db, name, id) as any, data as any);
}

export async function removeDocument(name: CollectionName, id: string) {
  if (!db) throw new Error('Firebase is not configured yet. Add your Firebase environment variables.');
  return deleteDoc(doc(db, name, id));
}

export async function fetchSongs() {
  if (!db) return [] as Song[];
  const snapshot = await getDocs(query(collection(db, 'songs'), where('published', '==', true), limit(500)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Song[];
}

export const firestoreHelpers = {
  serverTimestamp,
  increment,
  orderBy,
  where,
  query,
  limit
};

export function favoriteDocumentId(userId: string, songId: string) {
  return `${userId}_${songId}`;
}

export function recentlyPlayedDocumentId(userId: string, songId: string) {
  return `${userId}_${songId}`;
}

export function mapRecentlyPlayed(items: RecentlyPlayed[], songs: Song[]) {
  return items
    .map((item) => ({ ...item, song: songs.find((song) => song.id === item.songId) }))
    .filter((item) => item.song);
}

export function emptySongCollections(): { songs: Song[]; artists: Artist[]; albums: Album[]; playlists: Playlist[] } {
  return { songs: [], artists: [], albums: [], playlists: [] };
}
