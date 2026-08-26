'use client';

import {
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { favoriteDocumentId, recentlyPlayedDocumentId, saveDocument, removeDocument, firestoreHelpers } from '@/lib/firestore';
import { useAuth } from '@/components/providers/auth-provider';
import type { Song } from '@/lib/types';

export type RepeatMode = 'off' | 'all' | 'one';

interface MusicContextValue {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  favoriteIds: Set<string>;
  playSong: (song: Song, nextQueue?: Song[]) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (value: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleFavorite: (song?: Song) => Promise<void>;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.82);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const repeatRef = useRef<RepeatMode>('off');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => { repeatRef.current = repeat; }, [repeat]);

  useEffect(() => {
    if (!db || !user) {
      setFavoriteIds(new Set());
      return;
    }
    const favoriteQuery = query(collection(db, 'favorites'), where('userId', '==', user.uid));
    return onSnapshot(favoriteQuery, (snapshot) => {
      setFavoriteIds(new Set(snapshot.docs.map((item) => item.data().songId as string)));
    }, () => setFavoriteIds(new Set()));
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setIsLoading(false);
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError('This track could not be played. Try again in a moment.');
    };
    const onEnded = () => {
      if (repeatRef.current === 'one') {
        audio.currentTime = 0;
        void audio.play().catch(() => setIsPlaying(false));
        return;
      }
      playNextRef.current();
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('durationchange', onLoaded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('durationchange', onLoaded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      audio.src = '';
      audioRef.current = null;
    };
    // The event listeners intentionally bind once; the next-track ref below stays current.
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    setError(null);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(currentSong.duration || 0);
    audio.src = currentSong.audioUrl;
    audio.load();
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    audio.volume = isMuted ? 0 : volume;
    if (isPlaying) {
      void audio.play().catch(() => {
        setIsPlaying(false);
        setError('Playback was blocked by the browser. Tap play to start this track.');
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, isMuted, volume, currentSong]);

  const playNextRef = useRef<() => void>(() => undefined);

  const recordPlay = useCallback(async (song: Song) => {
    if (!user || !db) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/plays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ songId: song.id })
      });
      if (!response.ok) throw new Error('play api unavailable');
    } catch {
      // The client-side fallback keeps listening history working when Admin credentials
      // are not present locally. Firestore rules still scope the write to this UID.
      try {
        await saveDocument('recentlyPlayed', recentlyPlayedDocumentId(user.uid, song.id), {
          userId: user.uid,
          songId: song.id,
          lastPlayedAt: serverTimestamp(),
          playCount: firestoreHelpers.increment(1)
        });
      } catch {
        // Listening should remain uninterrupted if analytics writes are unavailable.
      }
    }
  }, [user]);

  const playSong = useCallback((song: Song, nextQueue?: Song[]) => {
    setQueue((previous) => nextQueue?.length ? nextQueue : previous.length ? previous : [song]);
    setCurrentSong(song);
    setError(null);
    setIsPlaying(true);
    void recordPlay(song);
  }, [recordPlay]);

  const playNext = useCallback(() => {
    if (!currentSong || queue.length === 0) return;
    if (repeat === 'one') {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      }
      return;
    }
    const currentIndex = queue.findIndex((song) => song.id === currentSong.id);
    let nextIndex = currentIndex + 1;
    if (shuffle && queue.length > 1) {
      const candidates = queue.map((_, index) => index).filter((index) => index !== currentIndex);
      nextIndex = candidates[Math.floor(Math.random() * candidates.length)];
    }
    if (nextIndex >= queue.length) {
      if (repeat === 'all') nextIndex = 0;
      else {
        setIsPlaying(false);
        return;
      }
    }
    const nextSong = queue[nextIndex];
    if (nextSong) {
      setCurrentSong(nextSong);
      setIsPlaying(true);
      void recordPlay(nextSong);
    }
  }, [currentSong, queue, repeat, shuffle, recordPlay]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const playPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 4) {
      audio.currentTime = 0;
      return;
    }
    const currentIndex = queue.findIndex((song) => song.id === currentSong?.id);
    const previous = queue[currentIndex - 1];
    if (previous) {
      setCurrentSong(previous);
      setIsPlaying(true);
      void recordPlay(previous);
    } else if (audio) {
      audio.currentTime = 0;
    }
  }, [currentSong, queue, recordPlay]);

  const toggleFavorite = useCallback(async (song = currentSong || undefined) => {
    if (!song) return;
    if (!user || !db) {
      toast.error('Sign in to save favorites.');
      return;
    }
    const id = favoriteDocumentId(user.uid, song.id);
    try {
      if (favoriteIds.has(song.id)) {
        await removeDocument('favorites', id);
        toast.success('Removed from favorites.');
      } else {
        await saveDocument('favorites', id, { userId: user.uid, songId: song.id, createdAt: serverTimestamp() });
        toast.success('Added to favorites.');
      }
    } catch {
      toast.error('Could not update favorites.');
    }
  }, [currentSong, favoriteIds, user]);

  const seek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value;
      setCurrentTime(value);
    }
  }, []);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    setIsMuted(value === 0);
  }, []);

  const value = useMemo<MusicContextValue>(() => ({
    currentSong,
    queue,
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    favoriteIds,
    playSong,
    togglePlay: () => setIsPlaying((playing) => !playing),
    playNext,
    playPrevious,
    seek,
    setVolume,
    toggleMute: () => setIsMuted((muted) => !muted),
    toggleShuffle: () => setShuffle((enabled) => !enabled),
    toggleRepeat: () => setRepeat((mode) => mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'),
    toggleFavorite
  }), [currentSong, queue, isPlaying, isLoading, error, currentTime, duration, volume, isMuted, shuffle, repeat, favoriteIds, playSong, playNext, playPrevious, seek, setVolume, toggleFavorite]);

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const value = useContext(MusicContext);
  if (!value) throw new Error('useMusic must be used inside MusicProvider');
  return value;
}
