'use client';

import Link from 'next/link';
import { Heart, ListPlus, MoreHorizontal, Play, Pause, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Artwork } from '@/components/ui/artwork';
import { PlayButton } from '@/components/ui/play-button';
import { PlaylistDialog } from '@/components/library/playlist-dialog';
import { useMusic } from '@/components/providers/music-provider';
import type { Song } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

export function SongCard({ song, queue = [], compact = false }: { song: Song; queue?: Song[]; compact?: boolean }) {
  const { currentSong, isPlaying, isLoading, playSong, togglePlay, toggleFavorite, favoriteIds } = useMusic();
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const active = currentSong?.id === song.id;
  const liked = favoriteIds.has(song.id);

  if (compact) return <SongRow song={song} queue={queue} />;
  return (
    <article className="group relative min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-panel2 shadow-card">
        <Artwork src={song.coverUrl} title={song.title} alt={`${song.title} cover`} size="lg" rounded="rounded-none" className="h-full w-full transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-70" />
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <PlayButton size="sm" playing={active && isPlaying} loading={active && isLoading} onClick={() => active ? togglePlay() : playSong(song, queue.length ? queue : [song])} label={active && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`} />
          <div className="flex gap-1.5"><button type="button" onClick={() => void toggleFavorite(song)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/80 backdrop-blur transition hover:border-gold/50 hover:text-gold" aria-label={liked ? `Remove ${song.title} from favorites` : `Favorite ${song.title}`}><Heart className="h-3.5 w-3.5" fill={liked ? 'currentColor' : 'none'} /></button><button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/80 backdrop-blur transition hover:border-gold/50 hover:text-gold" aria-label={`More options for ${song.title}`}><MoreHorizontal className="h-4 w-4" /></button></div>
        </div>
        {active && isPlaying && <span className="absolute left-3 top-3 flex h-7 items-center gap-1 rounded-full border border-gold/25 bg-black/55 px-2 text-[10px] font-semibold uppercase tracking-wider text-gold backdrop-blur"><span className="equalizer"><i /><i /><i /></span> Playing</span>}
      </div>
      <div className="mt-3 min-w-0 pr-1"><Link href={`/song/${song.id}`} className="block truncate text-sm font-semibold text-white transition hover:text-gold">{song.title}</Link><div className="mt-1 flex items-center justify-between gap-2"><Link href={song.artistId ? `/artist/${song.artistId}` : '/artists'} className="truncate text-xs text-white/45 hover:text-white/75">{song.artistName}</Link><span className="shrink-0 text-[11px] tabular-nums text-white/30">{formatDuration(song.duration)}</span></div></div>
      {menuOpen && <SongMenu song={song} onPlaylist={() => { setPlaylistOpen(true); setMenuOpen(false); }} onClose={() => setMenuOpen(false)} />}
      <PlaylistDialog song={song} open={playlistOpen} onClose={() => setPlaylistOpen(false)} />
    </article>
  );
}

function SongMenu({ song, onPlaylist, onClose }: { song: Song; onPlaylist: () => void; onClose: () => void }) {
  return <div className="absolute right-0 top-[calc(100%-65px)] z-20 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1d1d1d] p-1.5 shadow-2xl" onMouseLeave={onClose}><Link href={`/song/${song.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/70 hover:bg-white/[.07] hover:text-white"><ScrollText className="h-3.5 w-3.5" />Open song</Link><button type="button" onClick={onPlaylist} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[.07] hover:text-white"><ListPlus className="h-3.5 w-3.5" />Add to playlist</button><button type="button" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/song/${song.id}`).then(() => undefined)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[.07] hover:text-white"><Play className="h-3.5 w-3.5" />Copy share link</button></div>;
}

export function SongRow({ song, queue = [] }: { song: Song; queue?: Song[] }) {
  const { currentSong, isPlaying, isLoading, playSong, togglePlay, toggleFavorite, favoriteIds } = useMusic();
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const active = currentSong?.id === song.id;
  const liked = favoriteIds.has(song.id);
  return <div className="group flex min-w-0 items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-white/[.045] md:gap-4 md:px-3"><PlayButton size="sm" playing={active && isPlaying} loading={active && isLoading} onClick={() => active ? togglePlay() : playSong(song, queue.length ? queue : [song])} label={active && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`} /><Artwork src={song.coverUrl} title={song.title} alt="" size="sm" rounded="rounded-xl" /><div className="min-w-0 flex-1"><Link href={`/song/${song.id}`} className="block truncate text-sm font-medium text-white hover:text-gold">{song.title}</Link><Link href={song.artistId ? `/artist/${song.artistId}` : '/artists'} className="mt-1 block truncate text-xs text-white/40 hover:text-white/70">{song.artistName}</Link></div><span className="hidden shrink-0 text-xs tabular-nums text-white/35 sm:block">{formatDuration(song.duration)}</span><button type="button" onClick={() => void toggleFavorite(song)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/30 transition hover:bg-white/[.07] hover:text-gold" aria-label={liked ? 'Remove favorite' : 'Add favorite'}><Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} /></button><button type="button" onClick={() => setPlaylistOpen(true)} className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/30 transition hover:bg-white/[.07] hover:text-gold sm:flex" aria-label="Add to playlist"><ListPlus className="h-4 w-4" /></button><PlaylistDialog song={song} open={playlistOpen} onClose={() => setPlaylistOpen(false)} /></div>;
}
