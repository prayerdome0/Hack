'use client';

import Link from 'next/link';
import { ArrowRight, Headphones, MoveUpRight, Play, Sparkles, Waves } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useLibrary } from '@/components/providers/library-provider';
import { subscribeCollection, firestoreHelpers } from '@/lib/firestore';
import { SongCard } from '@/components/library/song-card';
import { ArtistCard } from '@/components/library/artist-card';
import { AlbumCard } from '@/components/library/album-card';
import { PlaylistCard } from '@/components/library/playlist-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState, InlineEmpty } from '@/components/ui/empty-state';
import { Logo } from '@/components/ui/logo';
import { useMusic } from '@/components/providers/music-provider';
import type { RecentlyPlayed, Song } from '@/lib/types';
import { timestampToMillis } from '@/lib/utils';

export function HomeContent() {
  const { songs, artists, albums, playlists, loading } = useLibrary();
  const { user } = useAuth();
  const { currentSong } = useMusic();
  const [recent, setRecent] = useState<RecentlyPlayed[]>([]);

  useEffect(() => {
    if (!user) { setRecent([]); return; }
    return subscribeCollection<RecentlyPlayed>('recentlyPlayed', [firestoreHelpers.where('userId', '==', user.uid)], (items) => setRecent(items.sort((a, b) => timestampToMillis(b.lastPlayedAt) - timestampToMillis(a.lastPlayedAt)).slice(0, 6)));
  }, [user]);

  const featured = songs.filter((song) => song.featured).slice(0, 6);
  const latest = songs.slice(0, 6);
  const popular = [...songs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 6);
  const recommended = songs.filter((song) => !featured.some((featuredSong) => featuredSong.id === song.id)).slice(0, 6);
  const recentSongs = recent.map((item) => songs.find((song) => song.id === item.songId)).filter(Boolean) as Song[];
  const genres = useMemo(() => Array.from(new Set(songs.map((song) => song.genre).filter(Boolean))).slice(0, 4) as string[], [songs]);

  return <div className="space-y-14 md:space-y-20">
    <section className="relative isolate overflow-hidden rounded-[28px] border border-gold/20 bg-[radial-gradient(circle_at_84%_30%,rgba(215,181,109,.22),transparent_28%),linear-gradient(115deg,#18130d,#0c0c0c_56%,#17130c)] px-6 py-10 shadow-gold sm:px-10 sm:py-14 md:min-h-[340px] md:px-14 md:py-16"><div className="hero-grid absolute inset-0 -z-10 opacity-70" /><div className="absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full border border-gold/15 md:h-[460px] md:w-[460px]" /><div className="absolute -right-4 top-[-70px] -z-10 h-64 w-64 rounded-full border border-gold/10 md:h-[380px] md:w-[380px]" /><div className="absolute bottom-[-110px] right-[15%] -z-10 h-56 w-56 rounded-full bg-gold/10 blur-3xl" /><div className="relative max-w-2xl"><div className="mb-8 flex items-center gap-3 md:mb-12"><Logo compact /><span className="h-px w-10 bg-gold/50" /><span className="text-[10px] font-semibold uppercase tracking-[.28em] text-gold/80">The sound is yours</span></div><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.24em] text-gold"><Sparkles className="h-3.5 w-3.5" /> SIMZ NAXTY</p><h1 className="max-w-[640px] font-display text-4xl font-semibold leading-[1.03] tracking-[-.045em] text-white sm:text-5xl md:text-6xl">Music that meets<br /><span className="text-gold">the moment.</span></h1><p className="mt-5 max-w-[470px] text-sm leading-6 text-white/50 sm:text-base">A focused space for every note, story and late-night replay. Tune in to the SIMZ NAXTY library.</p><div className="mt-8 flex flex-wrap items-center gap-3"><Link href="/discover" className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-xs font-semibold text-black transition hover:bg-gold-bright"><Play className="h-3.5 w-3.5" fill="currentColor" />Start listening</Link><Link href="/search" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-xs font-semibold text-white/75 transition hover:border-gold/50 hover:text-white">Explore catalog <ArrowRight className="h-3.5 w-3.5" /></Link></div></div><div className="absolute bottom-8 right-10 hidden items-end gap-1 opacity-40 lg:flex" aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <span key={index} className="w-1 rounded-full bg-gold" style={{ height: `${12 + ((index * 17) % 54)}px` }} />)}</div></section>

    <div className="grid gap-4 sm:grid-cols-3"><Metric icon={<Headphones className="h-4 w-4" />} value={songs.length ? `${songs.length}` : '—'} label="tracks in the library" /><Metric icon={<Waves className="h-4 w-4" />} value={artists.length ? `${artists.length}` : '—'} label="voices to discover" /><Metric icon={<MoveUpRight className="h-4 w-4" />} value={albums.length ? `${albums.length}` : '—'} label="albums curated" /></div>

    <HomeSection title="Featured songs" eyebrow="Made for you" href="/songs" songs={featured} loading={loading} />
    <HomeSection title="Recently added" eyebrow="Fresh in" href="/songs" songs={latest} loading={loading} />
    <HomeSection title="Popular songs" eyebrow="Most played" href="/songs" songs={popular} loading={loading} />

    <section><SectionHeading title="Popular artists" eyebrow="Meet the voices" href="/artists" />{artists.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{artists.slice(0, 6).map((artist) => <ArtistCard key={artist.id} artist={artist} />)}</div> : <InlineEmpty text="Artist profiles will appear here as the catalog grows." />}</section>
    <section><SectionHeading title="Featured albums" eyebrow="Long-form listening" href="/albums" />{albums.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{albums.slice(0, 5).map((album) => <AlbumCard key={album.id} album={album} />)}</div> : <InlineEmpty text="Albums will appear here when they are published." />}</section>
    <HomeSection title="Recommended music" eyebrow="Because you listen" href="/discover" songs={recommended} loading={loading} />
    <section><SectionHeading title="Featured playlists" eyebrow="Curated sets" href="/playlists" />{playlists.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{playlists.slice(0, 5).map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}</div> : <InlineEmpty text="Public playlists will appear here soon." />}</section>
    <section><SectionHeading title="Explore by genre" eyebrow="Find your frequency" />{genres.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{genres.map((genre, index) => <Link href={`/search?q=${encodeURIComponent(genre)}`} key={genre} className="group relative min-h-[130px] overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-br from-gold/[.16] via-white/[.03] to-transparent p-5"><span className="absolute -right-7 -top-9 h-28 w-28 rounded-full border border-gold/25 transition group-hover:scale-125" /><span className="absolute -bottom-10 right-8 h-20 w-20 rounded-full border border-white/10" /><span className="relative text-[10px] font-semibold uppercase tracking-[.2em] text-gold/70">0{index + 1}</span><h3 className="relative mt-7 font-display text-xl font-medium text-white transition group-hover:text-gold">{genre}</h3></Link>)}</div> : <InlineEmpty text="Genres will be available once music is published." />}</section>
    <section><SectionHeading title="Continue listening" eyebrow="Pick up where you left off" />{currentSong ? <div className="max-w-2xl"><SongCard compact song={currentSong} queue={songs} /></div> : recentSongs.length ? <div className="max-w-2xl"><SongCard compact song={recentSongs[0]} queue={recentSongs} /></div> : <InlineEmpty text="Press play on a song and it will wait for you here." />}</section>
    <section><SectionHeading title="Recently played" eyebrow="Your listening history" href="/recently-played" />{recentSongs.length ? <div className="max-w-3xl divide-y divide-white/[.06]">{recentSongs.slice(0, 5).map((song) => <SongCard key={song.id} compact song={song} queue={recentSongs} />)}</div> : <EmptyState icon="library" title={user ? 'Nothing played yet.' : 'Sign in to remember your listening.'} description={user ? 'Your most recent plays will show up here.' : 'Your listening history stays synced across every device.'} action={!user ? { label: 'Sign in', href: '/login' } : undefined} />}</section>
  </div>;
}

function HomeSection({ title, eyebrow, href, songs, loading }: { title: string; eyebrow?: string; href?: string; songs: Song[]; loading: boolean }) {
  return <section><SectionHeading title={title} eyebrow={eyebrow} href={href} />{loading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="animate-pulse"><div className="aspect-square rounded-2xl bg-white/[.06]" /><div className="mt-3 h-3 w-3/4 rounded bg-white/[.06]" /><div className="mt-2 h-2 w-1/2 rounded bg-white/[.04]" /></div>)}</div> : songs.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{songs.map((song) => <SongCard key={song.id} song={song} queue={songs} />)}</div> : <InlineEmpty text="No music yet. Check back soon." />}</section>;
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] px-4 py-3.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 text-gold">{icon}</span><div><p className="font-display text-lg font-semibold text-white">{value}</p><p className="text-[10px] uppercase tracking-[.15em] text-white/30">{label}</p></div></div>;
}
