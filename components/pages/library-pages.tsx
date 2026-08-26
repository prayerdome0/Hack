'use client';

import Link from 'next/link';
import { ArrowRight, ChevronDown, Filter, Headphones, ListFilter, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useLibrary } from '@/components/providers/library-provider';
import { useMusic } from '@/components/providers/music-provider';
import { subscribeCollection, firestoreHelpers } from '@/lib/firestore';
import type { Playlist, RecentlyPlayed, Song } from '@/lib/types';
import { normalizeSearch, timestampToMillis } from '@/lib/utils';
import { SongCard, SongRow } from '@/components/library/song-card';
import { CreatePlaylistButton } from '@/components/library/playlist-dialog';
import { ArtistCard } from '@/components/library/artist-card';
import { AlbumCard } from '@/components/library/album-card';
import { PlaylistCard } from '@/components/library/playlist-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState, InlineEmpty } from '@/components/ui/empty-state';
import { Artwork } from '@/components/ui/artwork';

export function DiscoverPage() {
  const { songs, artists, albums, loading } = useLibrary();
  const [genre, setGenre] = useState('All genres');
  const genres = Array.from(new Set(songs.map((song) => song.genre).filter(Boolean))) as string[];
  const filtered = genre === 'All genres' ? songs : songs.filter((song) => song.genre === genre);
  const featured = songs.filter((song) => song.featured);
  return <div className="space-y-12 md:space-y-16"><PageIntro eyebrow="Discover" title="Find your next repeat." description="Explore the latest uploads, the sounds getting replayed, and the artists behind them." action={songs.length ? undefined : { label: 'Search the catalog', href: '/search' }} /><div className="flex flex-wrap items-center gap-2"><div className="mr-2 flex items-center gap-2 text-xs text-white/40"><SlidersHorizontal className="h-4 w-4" />Filter by</div><GenrePill active={genre === 'All genres'} onClick={() => setGenre('All genres')}>All genres</GenrePill>{genres.map((item) => <GenrePill key={item} active={genre === item} onClick={() => setGenre(item)}>{item}</GenrePill>)}</div><section><SectionHeading title="On repeat" eyebrow="Featured right now" />{featured.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{featured.map((song) => <SongCard key={song.id} song={song} queue={featured} />)}</div> : <InlineEmpty text="Featured releases will appear here when an admin highlights them." />}</section><section><SectionHeading title={genre === 'All genres' ? 'All sounds' : genre} eyebrow="The catalog" />{loading ? <LoadingGrid /> : filtered.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{filtered.map((song) => <SongCard key={song.id} song={song} queue={filtered} />)}</div> : <EmptyState title="No music yet. Check back soon." description="There are no published tracks in this collection just yet." />}</section><section><SectionHeading title="Artists to know" eyebrow="The people behind the music" href="/artists" />{artists.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{artists.slice(0, 6).map((artist) => <ArtistCard key={artist.id} artist={artist} />)}</div> : <InlineEmpty text="Artist profiles will appear here as the catalog grows." />}</section><section><SectionHeading title="Deep listens" eyebrow="Albums and projects" href="/albums" />{albums.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{albums.slice(0, 6).map((album) => <AlbumCard key={album.id} album={album} />)}</div> : <InlineEmpty text="Published albums will appear here soon." />}</section></div>;
}

export function SongsPage() {
  const { songs, loading } = useLibrary();
  const [genre, setGenre] = useState('All genres');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const genres = Array.from(new Set(songs.map((song) => song.genre).filter(Boolean))) as string[];
  const filtered = genre === 'All genres' ? songs : songs.filter((song) => song.genre === genre);
  return <div className="space-y-8"><PageIntro eyebrow="Library" title="All songs" description="Every published SIMZ NAXTY track, ready when you are." /><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 overflow-x-auto pb-1"><Filter className="mr-1 h-4 w-4 shrink-0 text-white/35" /><GenrePill active={genre === 'All genres'} onClick={() => setGenre('All genres')}>All songs</GenrePill>{genres.map((item) => <GenrePill key={item} active={genre === item} onClick={() => setGenre(item)}>{item}</GenrePill>)}</div><div className="hidden items-center gap-1 rounded-xl border border-white/[.08] p-1 sm:flex"><button type="button" onClick={() => setView('list')} className={view === 'list' ? 'rounded-lg bg-white/[.08] px-3 py-1.5 text-xs text-white' : 'rounded-lg px-3 py-1.5 text-xs text-white/35'}>List</button><button type="button" onClick={() => setView('grid')} className={view === 'grid' ? 'rounded-lg bg-white/[.08] px-3 py-1.5 text-xs text-white' : 'rounded-lg px-3 py-1.5 text-xs text-white/35'}>Grid</button></div></div>{loading ? <LoadingRows /> : filtered.length ? view === 'grid' ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{filtered.map((song) => <SongCard key={song.id} song={song} queue={filtered} />)}</div> : <div className="divide-y divide-white/[.06] rounded-2xl border border-white/[.06] bg-white/[.015] px-1 py-1">{filtered.map((song) => <SongRow key={song.id} song={song} queue={filtered} />)}</div> : <EmptyState title="No music yet. Check back soon." description="Published songs will show up in your library as soon as they are available." />}</div>;
}

export function ArtistsPage() {
  const { artists, loading } = useLibrary();
  return <div className="space-y-9"><PageIntro eyebrow="Library" title="Artists" description="Meet the voices, stories and perspectives in the SIMZ NAXTY universe." />{loading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="aspect-square animate-pulse rounded-full bg-white/[.06]" />)}</div> : artists.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">{artists.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}</div> : <EmptyState icon="compass" title="No artists yet." description="Artist profiles will appear here when they are added to the catalog." />}</div>;
}

export function AlbumsPage() {
  const { albums, loading } = useLibrary();
  return <div className="space-y-9"><PageIntro eyebrow="Library" title="Albums" description="Take your time. Full projects, collected in one place." />{loading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="space-y-3"><div className="aspect-square animate-pulse rounded-2xl bg-white/[.06]" /><div className="h-3 w-3/4 animate-pulse rounded bg-white/[.06]" /></div>)}</div> : albums.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{albums.map((album) => <AlbumCard key={album.id} album={album} />)}</div> : <EmptyState icon="library" title="No albums yet." description="Albums will appear here as the catalog expands." />}</div>;
}

export function PlaylistsPage() {
  const { playlists: publicPlaylists, loading } = useLibrary();
  const { user } = useAuth();
  const [ownPlaylists, setOwnPlaylists] = useState<Playlist[]>([]);
  useEffect(() => {
    if (!user) { setOwnPlaylists([]); return; }
    return subscribeCollection<Playlist>('playlists', [firestoreHelpers.where('ownerId', '==', user.uid)], setOwnPlaylists);
  }, [user]);
  const playlists = [...ownPlaylists, ...publicPlaylists.filter((playlist) => !ownPlaylists.some((own) => own.id === playlist.id))];
  return <div className="space-y-9"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><PageIntro eyebrow="Your library" title="Playlists" description="Shape the mood. Keep your favorite sounds close and share the sets that move you." action={user ? undefined : { label: 'Sign in to create', href: '/login' }} />{user && <CreatePlaylistButton />}</div>{loading ? <LoadingGrid /> : playlists.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}</div> : <EmptyState icon="playlist" title="Your playlists are empty." description={user ? 'Create a playlist to start shaping it.' : 'Sign in to make playlists that follow you everywhere.'} action={!user ? { label: 'Sign in', href: '/login' } : undefined} />}</div>;
}

export function FavoritesPage() {
  const { user } = useAuth();
  const { songs, loading } = useLibrary();
  const { favoriteIds } = useMusic();
  const favorites = songs.filter((song) => favoriteIds.has(song.id));
  return <div className="space-y-9"><PageIntro eyebrow="Your space" title="Favorites" description="The tracks you want to keep close." action={!user ? { label: 'Sign in to sync', href: '/login' } : undefined} />{loading ? <LoadingRows /> : favorites.length ? <div className="divide-y divide-white/[.06] rounded-2xl border border-white/[.06] bg-white/[.015] px-1 py-1">{favorites.map((song) => <SongRow key={song.id} song={song} queue={favorites} />)}</div> : <EmptyState icon="heart" title={user ? 'Nothing saved yet.' : 'Sign in to save your favorites.'} description={user ? 'Tap the heart on any song to build your personal collection.' : 'Your favorites are private and synced securely with your account.'} action={!user ? { label: 'Sign in', href: '/login' } : { label: 'Discover music', href: '/discover' }} />}</div>;
}

export function RecentlyPlayedPage() {
  const { user } = useAuth();
  const { songs } = useLibrary();
  const [items, setItems] = useState<RecentlyPlayed[]>([]);
  useEffect(() => {
    if (!user) { setItems([]); return; }
    return subscribeCollection<RecentlyPlayed>('recentlyPlayed', [firestoreHelpers.where('userId', '==', user.uid)], (next) => setItems(next.sort((a, b) => timestampToMillis(b.lastPlayedAt) - timestampToMillis(a.lastPlayedAt))));
  }, [user]);
  const recentSongs = items.map((item) => songs.find((song) => song.id === item.songId)).filter(Boolean) as Song[];
  return <div className="space-y-9"><PageIntro eyebrow="Your space" title="Recently played" description="A quiet record of where the music has taken you." />{recentSongs.length ? <div className="divide-y divide-white/[.06] rounded-2xl border border-white/[.06] bg-white/[.015] px-1 py-1">{recentSongs.map((song) => <SongRow key={song.id} song={song} queue={recentSongs} />)}</div> : <EmptyState icon="library" title={user ? 'Nothing played yet.' : 'Sign in to keep your history.'} description="Play a song to start building your listening history. Duplicate plays stay neatly grouped." action={!user ? { label: 'Sign in', href: '/login' } : { label: 'Browse songs', href: '/songs' }} />}</div>;
}

export function SearchPage() {
  return <Suspense fallback={<div className="space-y-5"><div className="h-12 animate-pulse rounded-2xl bg-white/[.06]" /><LoadingGrid /></div>}><SearchResults /></Suspense>;
}

function SearchResults() {
  const params = useSearchParams();
  const initial = params.get('q') || '';
  const [term, setTerm] = useState(initial);
  const { songs, artists, albums, playlists } = useLibrary();
  useEffect(() => setTerm(initial), [initial]);
  const queryTerm = normalizeSearch(term);
  const matchingSongs = queryTerm ? songs.filter((song) => `${song.title} ${song.artistName} ${song.albumName || ''} ${song.genre || ''}`.toLocaleLowerCase().includes(queryTerm)) : [];
  const matchingArtists = queryTerm ? artists.filter((artist) => `${artist.name} ${artist.genre || ''} ${artist.biography || ''}`.toLocaleLowerCase().includes(queryTerm)) : [];
  const matchingAlbums = queryTerm ? albums.filter((album) => `${album.title} ${album.artistName}`.toLocaleLowerCase().includes(queryTerm)) : [];
  const matchingPlaylists = queryTerm ? playlists.filter((playlist) => `${playlist.name} ${playlist.description || ''}`.toLocaleLowerCase().includes(queryTerm)) : [];
  const hasResults = matchingSongs.length || matchingArtists.length || matchingAlbums.length || matchingPlaylists.length;
  return <div className="space-y-10"><div className="max-w-2xl"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.24em] text-gold/80">Global search</p><h1 className="font-display text-4xl font-semibold tracking-[-.04em] text-white md:text-5xl">What are you in the mood for?</h1><div className="mt-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] px-4 py-1 focus-within:border-gold/45"><SearchIcon className="h-5 w-5 shrink-0 text-gold/70" /><input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search songs, artists, albums, playlists" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25" /><span className="hidden text-[10px] text-white/25 sm:inline">{songs.length + artists.length + albums.length + playlists.length} indexed</span></div></div>{!queryTerm ? <EmptyState icon="search" title="Start with a feeling, artist or title." description="Search across every published song, artist, album and public playlist." /> : hasResults ? <div className="space-y-10"><ResultSection title="Songs" count={matchingSongs.length}>{<div className="divide-y divide-white/[.06] rounded-2xl border border-white/[.06] bg-white/[.015] px-1 py-1">{matchingSongs.map((song) => <SongRow key={song.id} song={song} queue={matchingSongs} />)}</div>}</ResultSection>{matchingArtists.length > 0 && <ResultSection title="Artists" count={matchingArtists.length}><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{matchingArtists.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}</div></ResultSection>}{matchingAlbums.length > 0 && <ResultSection title="Albums" count={matchingAlbums.length}><div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{matchingAlbums.map((album) => <AlbumCard key={album.id} album={album} />)}</div></ResultSection>}{matchingPlaylists.length > 0 && <ResultSection title="Playlists" count={matchingPlaylists.length}><div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{matchingPlaylists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}</div></ResultSection>}</div> : <EmptyState icon="search" title="No results for that search." description="Try a different spelling or a broader search." action={{ label: 'Browse all songs', href: '/songs' }} />}</div>;
}

export function LyricsPage() {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white/[.05]" />}><LyricsView /></Suspense>;
}

function LyricsView() {
  const params = useSearchParams();
  const { songs } = useLibrary();
  const { currentSong } = useMusic();
  const selectedId = params.get('song') || currentSong?.id;
  const selected = songs.find((song) => song.id === selectedId) || currentSong;
  return <div className="space-y-8"><PageIntro eyebrow="Words & stories" title="Lyrics" description="Stay close to every line." />{selected ? <div className="grid gap-8 lg:grid-cols-[minmax(0,350px)_1fr]"><aside className="lg:sticky lg:top-28 lg:self-start"><Artwork src={selected.coverUrl} title={selected.title} alt={`${selected.title} cover`} size="xl" rounded="rounded-[28px]" className="mx-auto aspect-square h-auto w-full max-w-[350px]" /><div className="mt-5"><h2 className="font-display text-2xl font-semibold text-white">{selected.title}</h2><p className="mt-1 text-sm text-white/45">{selected.artistName}</p></div><div className="mt-5 flex flex-wrap gap-2"><Link href={`/song/${selected.id}`} className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-white/65 hover:border-gold/40 hover:text-white">Song details</Link><Link href={`/artist/${selected.artistId || ''}`} className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-white/65 hover:border-gold/40 hover:text-white">Artist</Link></div></aside><article className="min-h-[420px] rounded-[28px] border border-white/[.07] bg-white/[.025] p-6 sm:p-9 md:p-12"><div className="mb-8 flex items-center justify-between border-b border-white/[.08] pb-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-gold/75">Plain text lyrics</p><h3 className="mt-2 font-display text-xl font-medium text-white">{selected.title}</h3></div><Headphones className="h-5 w-5 text-white/20" /></div>{selected.lyrics?.trim() ? <div className="max-h-[650px] overflow-y-auto pr-3 text-base leading-8 text-white/75 sm:text-lg sm:leading-9">{selected.lyrics.split('\n').map((line, index) => <p key={`${line}-${index}`} className="lyric-line min-h-[1.5rem]">{line || '\u00a0'}</p>)}</div> : <div className="flex min-h-[300px] flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold"><Headphones className="h-6 w-6" /></div><h3 className="mt-5 font-display text-lg text-white">Lyrics are on the way.</h3><p className="mt-2 max-w-sm text-sm leading-6 text-white/40">An admin can add them from the song studio. Check back soon.</p></div>}</article></div> : <EmptyState icon="music" title="Choose a song to see its lyrics." description="Open lyrics from the player or any song detail page." action={{ label: 'Browse songs', href: '/songs' }} />}</div>;
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: { label: string; href: string } }) {
  return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.25em] text-gold/80">{eyebrow}</p><h1 className="font-display text-4xl font-semibold tracking-[-.045em] text-white md:text-5xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/45">{description}</p></div>{action && <Link href={action.href} className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/30 px-4 py-2.5 text-xs font-semibold text-gold hover:bg-gold/10">{action.label}<ArrowRight className="h-3.5 w-3.5" /></Link>}</div>;
}

function GenrePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={active ? 'shrink-0 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-black' : 'shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs text-white/45 transition hover:border-white/25 hover:text-white'}>{children}</button>;
}

function ResultSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return <section><div className="mb-4 flex items-center gap-3"><h2 className="font-display text-xl font-semibold text-white">{title}</h2><span className="rounded-full bg-white/[.07] px-2 py-1 text-[10px] text-white/40">{count}</span></div>{children}</section>;
}

function LoadingGrid() { return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="animate-pulse space-y-3"><div className="aspect-square rounded-2xl bg-white/[.06]" /><div className="h-3 w-3/4 rounded bg-white/[.06]" /><div className="h-2 w-1/2 rounded bg-white/[.04]" /></div>)}</div>; }
function LoadingRows() { return <div className="space-y-2">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="flex animate-pulse items-center gap-3 rounded-2xl px-3 py-3"><div className="h-8 w-8 rounded-full bg-white/[.07]" /><div className="h-12 w-12 rounded-xl bg-white/[.07]" /><div className="h-3 w-48 max-w-[50%] rounded bg-white/[.07]" /></div>)}</div>; }
