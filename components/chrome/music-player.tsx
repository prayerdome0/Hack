'use client';

import Link from 'next/link';
import { ChevronDown, ChevronUp, Heart, ListMusic, Maximize2, Mic2, Minimize2, MoreHorizontal, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { useState } from 'react';
import { useMusic } from '@/components/providers/music-provider';
import { Artwork } from '@/components/ui/artwork';
import { PlayButton } from '@/components/ui/play-button';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function MusicPlayer() {
  const music = useMusic();
  const [expanded, setExpanded] = useState(false);
  const { currentSong } = music;
  if (!currentSong) return null;
  const total = music.duration || currentSong.duration || 0;
  const progress = Math.min(music.currentTime, total || 0);
  return <>
    <div className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-gold/15 bg-[#121212]/95 shadow-[0_-15px_40px_rgba(0,0,0,.4)] backdrop-blur-xl md:block md:left-[245px]"><div className="mx-auto flex h-[88px] max-w-[1440px] items-center gap-6 px-7"><PlayerTrack song={currentSong} onExpand={() => setExpanded(true)} /><div className="flex flex-1 flex-col items-center gap-2"><div className="flex items-center gap-4"><button type="button" onClick={music.toggleShuffle} className={cn('hidden h-8 w-8 items-center justify-center rounded-full transition lg:flex', music.shuffle ? 'text-gold' : 'text-white/35 hover:text-white')} aria-label="Toggle shuffle"><Shuffle className="h-4 w-4" /></button><button type="button" onClick={music.playPrevious} className="flex h-8 w-8 items-center justify-center text-white/60 transition hover:text-white" aria-label="Previous song"><SkipBack className="h-4 w-4" fill="currentColor" /></button><PlayButton size="sm" playing={music.isPlaying} loading={music.isLoading} onClick={music.togglePlay} /><button type="button" onClick={music.playNext} className="flex h-8 w-8 items-center justify-center text-white/60 transition hover:text-white" aria-label="Next song"><SkipForward className="h-4 w-4" fill="currentColor" /></button><button type="button" onClick={music.toggleRepeat} className={cn('hidden h-8 w-8 items-center justify-center rounded-full transition lg:flex', music.repeat !== 'off' ? 'text-gold' : 'text-white/35 hover:text-white')} aria-label={`Repeat ${music.repeat}`}><Repeat className="h-4 w-4" /><span className="sr-only">{music.repeat}</span></button></div><ProgressBar value={progress} total={total} onChange={music.seek} /></div><div className="hidden items-center gap-3 lg:flex"><button type="button" onClick={() => void music.toggleFavorite()} className={cn('rounded-lg p-2 transition hover:bg-white/[.06]', music.favoriteIds.has(currentSong.id) ? 'text-gold' : 'text-white/40 hover:text-white')} aria-label="Favorite current song"><Heart className="h-4 w-4" fill={music.favoriteIds.has(currentSong.id) ? 'currentColor' : 'none'} /></button><Link href={`/lyrics?song=${currentSong.id}`} className="rounded-lg p-2 text-white/40 transition hover:bg-white/[.06] hover:text-white" aria-label="Open lyrics"><Mic2 className="h-4 w-4" /></Link><VolumeControl /><button type="button" onClick={() => setExpanded(true)} className="rounded-lg p-2 text-white/40 transition hover:bg-white/[.06] hover:text-white" aria-label="Expand player"><Maximize2 className="h-4 w-4" /></button></div></div><div className="h-0.5 w-full bg-white/[.05]"><div className="h-full bg-gold transition-[width]" style={{ width: total ? `${(progress / total) * 100}%` : '0%' }} /></div>{music.error && <div className="absolute bottom-full left-0 right-0 border-t border-red-300/20 bg-red-400/10 px-4 py-2 text-center text-xs text-red-200">{music.error}</div>}</div>
    <div className="fixed inset-x-0 bottom-[72px] z-40 flex h-[62px] items-center gap-3 border-t border-white/10 bg-[#121212]/95 px-3 backdrop-blur-xl md:hidden"><button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpanded(true)}><Artwork src={currentSong.coverUrl} title={currentSong.title} alt="" size="xs" rounded="rounded-lg" /><span className="min-w-0"><span className="block truncate text-xs font-semibold text-white">{currentSong.title}</span><span className="mt-0.5 block truncate text-[10px] text-white/40">{currentSong.artistName}</span></span></button><button type="button" onClick={() => void music.toggleFavorite()} className={cn('rounded-lg p-2', music.favoriteIds.has(currentSong.id) ? 'text-gold' : 'text-white/45')} aria-label="Favorite current song"><Heart className="h-4 w-4" fill={music.favoriteIds.has(currentSong.id) ? 'currentColor' : 'none'} /></button><button type="button" onClick={music.togglePlay} className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-black" aria-label={music.isPlaying ? 'Pause' : 'Play'}>{music.isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}</button><div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/[.06]"><div className="h-full bg-gold" style={{ width: total ? `${(progress / total) * 100}%` : '0%' }} /></div></div>
    {expanded && <ExpandedPlayer onClose={() => setExpanded(false)} />}
  </>;
}

function PlayerTrack({ song, onExpand }: { song: NonNullable<ReturnType<typeof useMusic>['currentSong']>; onExpand: () => void }) {
  return <button type="button" onClick={onExpand} className="flex w-[245px] min-w-0 items-center gap-3 text-left"><Artwork src={song.coverUrl} title={song.title} alt="" size="sm" rounded="rounded-xl" /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{song.title}</span><span className="mt-1 block truncate text-xs text-white/40">{song.artistName}</span></span></button>;
}

function ProgressBar({ value, total, onChange }: { value: number; total: number; onChange: (value: number) => void }) {
  return <div className="flex w-full max-w-[560px] items-center gap-3"><span className="w-8 text-right text-[10px] tabular-nums text-white/35">{formatDuration(value)}</span><input type="range" min={0} max={total || 0} step="any" value={Math.min(value, total || 0)} onChange={(event) => onChange(Number(event.target.value))} className="range-gold" aria-label="Seek track" /><span className="w-8 text-[10px] tabular-nums text-white/35">{formatDuration(total)}</span></div>;
}

function VolumeControl() {
  const music = useMusic();
  return <div className="flex items-center gap-1"><button type="button" onClick={music.toggleMute} className="p-2 text-white/40 hover:text-white" aria-label={music.isMuted ? 'Unmute' : 'Mute'}>{music.isMuted || music.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button><input type="range" min={0} max={1} step=".01" value={music.isMuted ? 0 : music.volume} onChange={(event) => music.setVolume(Number(event.target.value))} className="range-gold w-20" aria-label="Volume" /></div>;
}

function ExpandedPlayer({ onClose }: { onClose: () => void }) {
  const music = useMusic();
  const [queueOpen, setQueueOpen] = useState(false);
  const song = music.currentSong;
  if (!song) return null;
  const total = music.duration || song.duration || 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0a] px-5 pb-6 pt-5 md:inset-5 md:rounded-[32px] md:border md:border-white/10 md:px-10 md:pt-8">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-white/45 hover:text-white">
          <ChevronDown className="h-5 w-5" />Now playing
        </button>
        <div className="flex gap-1">
          <Link href={`/song/${song.id}`} onClick={onClose} className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white" aria-label="Open song"><MoreHorizontal className="h-5 w-5" /></Link>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white" aria-label="Close player"><X className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center overflow-y-auto py-5">
        <Artwork src={song.coverUrl} title={song.title} alt={`${song.title} artwork`} size="xl" rounded="rounded-[28px]" className="mx-auto aspect-square h-auto w-full max-w-[420px] shadow-[0_30px_100px_rgba(215,181,109,.12)]" />
        <div className="mt-8 flex items-end justify-between gap-4">
          <div className="min-w-0"><h2 className="truncate font-display text-2xl font-semibold text-white md:text-3xl">{song.title}</h2><p className="mt-2 truncate text-sm text-white/45">{song.artistName}</p></div>
          <button type="button" onClick={() => void music.toggleFavorite()} className={cn('rounded-full p-3 transition', music.favoriteIds.has(song.id) ? 'text-gold' : 'text-white/40 hover:text-white')} aria-label="Favorite current song"><Heart className="h-5 w-5" fill={music.favoriteIds.has(song.id) ? 'currentColor' : 'none'} /></button>
        </div>
        <div className="mt-8"><ProgressBar value={music.currentTime} total={total} onChange={music.seek} /></div>
        <div className="mt-7 flex items-center justify-center gap-7"><button type="button" onClick={music.toggleShuffle} className={cn('p-2', music.shuffle ? 'text-gold' : 'text-white/40')} aria-label="Toggle shuffle"><Shuffle className="h-5 w-5" /></button><button type="button" onClick={music.playPrevious} className="text-white/75 hover:text-white" aria-label="Previous song"><SkipBack className="h-6 w-6" fill="currentColor" /></button><PlayButton size="lg" playing={music.isPlaying} loading={music.isLoading} onClick={music.togglePlay} /><button type="button" onClick={music.playNext} className="text-white/75 hover:text-white" aria-label="Next song"><SkipForward className="h-6 w-6" fill="currentColor" /></button><button type="button" onClick={music.toggleRepeat} className={cn('p-2', music.repeat !== 'off' ? 'text-gold' : 'text-white/40')} aria-label="Toggle repeat"><Repeat className="h-5 w-5" /></button></div>
        <div className="mt-8 flex items-center justify-between text-white/40"><VolumeControl /><Link href={`/lyrics?song=${song.id}`} onClick={onClose} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs hover:bg-white/5 hover:text-gold"><Mic2 className="h-4 w-4" />Lyrics</Link><button type="button" onClick={() => setQueueOpen((open) => !open)} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-xs hover:bg-white/5 hover:text-gold', queueOpen && 'text-gold')}><ListMusic className="h-4 w-4" />Queue {queueOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}</button></div>
        {queueOpen && <div className="mt-4 max-h-48 overflow-y-auto rounded-2xl border border-white/[.08] bg-white/[.025] p-2">{music.queue.length ? music.queue.map((queuedSong) => <button type="button" key={queuedSong.id} onClick={() => { music.playSong(queuedSong, music.queue); setQueueOpen(false); }} className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[.06]', queuedSong.id === song.id && 'bg-gold/[.08]')}><Artwork src={queuedSong.coverUrl} title={queuedSong.title} alt="" size="xs" rounded="rounded-lg" /><span className="min-w-0 flex-1"><span className="block truncate text-xs text-white/80">{queuedSong.title}</span><span className="mt-0.5 block truncate text-[10px] text-white/35">{queuedSong.artistName}</span></span><span className="text-[10px] text-white/30">{formatDuration(queuedSong.duration)}</span></button>) : <p className="px-3 py-5 text-center text-xs text-white/35">Your queue is empty.</p>}</div>}
      </div>
    </div>
  );
}
