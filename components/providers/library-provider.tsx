'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeCollection, firestoreHelpers } from '@/lib/firestore';
import type { Album, Artist, Playlist, Song } from '@/lib/types';
import { timestampToMillis } from '@/lib/utils';

interface LibraryContextValue {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  loading: boolean;
  error: string | null;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function byNewest<T extends { createdAt?: unknown }>(items: T[]) {
  return [...items].sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = 0;
    const reportError = (nextError: Error) => {
      // Permission errors on optional public collections should not break the whole shell.
      if (active === 0) setError(nextError.message);
    };
    const songUnsubscribe = subscribeCollection<Song>('songs', [firestoreHelpers.where('published', '==', true)], (items) => {
      setSongs(byNewest(items));
      setLoading(false);
    }, reportError);
    const artistUnsubscribe = subscribeCollection<Artist>('artists', [], (items) => setArtists(byNewest(items)), reportError);
    const albumUnsubscribe = subscribeCollection<Album>('albums', [], (items) => setAlbums(byNewest(items)), reportError);
    const playlistUnsubscribe = subscribeCollection<Playlist>('playlists', [firestoreHelpers.where('isPublic', '==', true)], (items) => setPlaylists(byNewest(items)), reportError);
    const timer = window.setTimeout(() => setLoading(false), 4500);
    return () => {
      active += 1;
      window.clearTimeout(timer);
      songUnsubscribe?.();
      artistUnsubscribe?.();
      albumUnsubscribe?.();
      playlistUnsubscribe?.();
    };
  }, []);

  const value = useMemo(() => ({ songs, artists, albums, playlists, loading, error }), [songs, artists, albums, playlists, loading, error]);
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary must be used inside LibraryProvider');
  return value;
}
