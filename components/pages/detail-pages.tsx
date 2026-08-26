'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarDays, Check, Clock3, Disc3, Heart, ListPlus, Loader2, Play, Plus, Share2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { useLibrary } from '@/components/providers/library-provider';
import { useMusic } from '@/components/providers/music-provider';
import { subscribeCollection, saveDocument, updateDocument, removeDocument, firestoreHelpers } from '@/lib/firestore';
import type { Playlist, Song } from '@/lib/types';
import { formatDate, formatDuration } from '@/lib/utils';
import { AlbumArtwork, Artwork } from '@/components/ui/artwork';
import { ArtistAvatar } from '@/components/ui/artist-avatar';
import { PlayButton } from '@/components/ui/play-button';
import { SongRow } from '@/components/library/song-card';
import { PlaylistDialog } from '@/components/library/playlist-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeading } from '@/components/ui/section-heading';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function idFromParams(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function ArtistDetailPage() {
  const params = useParams();
  const id = idFromParams(params, 'id');
  const { artists, songs, albums, loading } = useLibrary();
  const { playSong } = useMusic();
  const artist = artists.find((item) => item.id === id);
  const artistSongs = songs.filter((song) => song.artistId === id || (artist && song.artistName === artist.name));
  const artistAlbums = albums.filter((album) => album.artistId === id || (artist && album.artistName === artist.name));
  if (loading && !artist) return <DetailLoading />;
  if (!artist) return <EmptyState icon="compass" title="Artist not found." description="This artist may not be published yet or the link may have changed." action={{ label: 'Back to artists', href: '/artists' }} />;
  return <div className="space-y-12"><BackLink href="/artists" label="All artists" /><section className="relative overflow-hidden rounded-[28px] border border-white/[.08] bg-gradient-to-br from-gold/[.15] via-white/[.03] to-transparent p-6 sm:p-10"><div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-gold/10" /><div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left"><ArtistAvatar name={artist.name} src={artist.profileImage} size="lg" className="h-36 w-36 border-2 border-gold/30 sm:h-44 sm:w-44" /><div className="max-w-2xl"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.24em] text-gold/80">Artist profile</p><h1 className="font-display text-4xl font-semibold tracking-[-.04em] text-white md:text-5xl">{artist.name}</h1>{artist.genre && <p className="mt-3 text-sm text-gold/75">{artist.genre}</p>}{artist.biography && <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">{artist.biography}</p>}<div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start"><PlayButton size="sm" onClick={() => artistSongs[0] && playSong(artistSongs[0], artistSongs)} label={`Play ${artist.name}`} /><button type="button" onClick={() => artistSongs[0] && playSong(artistSongs[0], artistSongs)} className="rounded-full bg-gold px-5 py-2.5 text-xs font-semibold text-black hover:bg-gold-bright">Play popular songs</button></div></div></div></section><section><SectionHeading title="Popular songs" eyebrow="Most played by this artist" />{artistSongs.length ? <div className="divide-y divide-white/[.06] rounded-2xl border border-white/[.06] bg-white/[.015] px-1 py-1">{artistSongs.slice(0, 5).map((song) => <SongRow key={song.id} song={song} queue={artistSongs} />)}</div> : <EmptyState title="No published songs yet." description="This artist's tracks will appear here when they are released." />}</section><section><SectionHeading title="Albums" eyebrow="Projects" />{artistAlbums.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">{artistAlbums.map((album) => <Link key={album.id} href={`/album/${album.id}`} className="group"><AlbumArtwork src={album.coverUrl} title={album.title} alt="" className="h-auto w-full aspect-square transition group-hover:scale-[1.02]" /><p className="mt-3 truncate text-sm font-medium text-white group-hover:text-gold">{album.title}</p></Link>)}</div> : <p className="rounded-2xl border border-dashed border-white/10 p-7 text-center text-sm text-white/35">No albums linked to this artist yet.</p>}</section></div>;
}

export function AlbumDetailPage() {
  const params = useParams();
  const id = idFromParams(params, 'id');
  const { albums, songs, loading } = useLibrary();
  const { playSong } = useMusic();
  const album = albums.find((item) => item.id === id);
  const albumSongs = album ? songs.filter((song) => song.albumId === album.id || album.songIds?.includes(song.id)) : [];
  if (loading && !album) return <DetailLoading />;
  if (!album) return <EmptyState icon="library" title="Album not found." description="This album may not be published yet or the link may have changed." action={{ label: 'Back to albums', href: '/albums' }} />;
  return <div className="space-y-12"><BackLink href="/albums" label="All albums" /><section className="flex flex-col gap-8 md:flex-row md:items-end"><AlbumArtwork src={album.coverUrl} title={album.title} alt={`${album.title} cover`} className="mx-auto h-56 w-56 shadow-gold sm:h-72 sm:w-72 md:mx-0" /><div className="min-w-0 text-center md:text-left"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.24em] text-gold/80">Album</p><h1 className="font-display text-4xl font-semibold tracking-[-.045em] text-white md:text-6xl">{album.title}</h1><Link href={album.artistId ? `/artist/${album.artistId}` : '/artists'} className="mt-4 block text-base text-white/55 hover:text-gold">{album.artistName}</Link>{album.description && <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/45 md:mx-0">{album.description}</p>}<div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start"><button type="button" disabled={!albumSongs.length} onClick={() => albumSongs[0] && playSong(albumSongs[0], albumSongs)} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-xs font-semibold text-black disabled:opacity-40"><Play className="h-3.5 w-3.5" fill="currentColor" />Play album</button><span className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-xs text-white/40"><Disc3 className="h-3.5 w-3.5" />{albumSongs.length} tracks{album.releaseDate ? ` · ${formatDate(album.releaseDate)}` : ''}</span></div></div></section><section><SectionHeading title="Tracklist" eyebrow="The complete project" />{albumSongs.length ? <div className="divide-y divide-white/[.06] rounded-2xl border border-white/[.06] bg-white/[.015] px-1 py-1">{albumSongs.map((song) => <SongRow key={song.id} song={song} queue={albumSongs} />)}</div> : <EmptyState title="No tracks on this album yet." description="The album is ready for its songs to be published." />}</section></div>;
}

export function SongDetailPage() {
  const params = useParams();
  const id = idFromParams(params, 'id');
  const { songs, loading } = useLibrary();
  const { currentSong, isPlaying, isLoading, playSong, togglePlay, toggleFavorite, favoriteIds } = useMusic();
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const song = songs.find((item) => item.id === id);
  if (loading && !song) return <DetailLoading />;
  if (!song) return <EmptyState title="Song not found." description="This track may not be published yet or the link may have changed." action={{ label: 'Browse songs', href: '/songs' }} />;
  const active = currentSong?.id === song.id;
  const liked = favoriteIds.has(song.id);
  return <div className="space-y-10"><BackLink href="/songs" label="All songs" /><section className="grid gap-8 rounded-[28px] border border-gold/15 bg-gradient-to-br from-gold/[.13] via-white/[.03] to-transparent p-6 sm:p-10 md:grid-cols-[280px_1fr] md:items-end"><Artwork src={song.coverUrl} title={song.title} alt={`${song.title} cover`} size="xl" rounded="rounded-[24px]" className="mx-auto h-auto w-full max-w-[280px] shadow-gold md:mx-0" /><div className="min-w-0 text-center md:text-left"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.24em] text-gold/80">Now in the library</p><h1 className="font-display text-4xl font-semibold tracking-[-.045em] text-white md:text-6xl">{song.title}</h1><Link href={song.artistId ? `/artist/${song.artistId}` : '/artists'} className="mt-3 block text-base text-white/55 hover:text-gold">{song.artistName}</Link>{song.albumName && <Link href={song.albumId ? `/album/${song.albumId}` : '/albums'} className="mt-1 inline-block text-sm text-white/35 hover:text-white/60">{song.albumName}</Link>}<div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start"><PlayButton size="md" playing={active && isPlaying} loading={active && isLoading} onClick={() => active ? togglePlay() : playSong(song, songs)} label={active && isPlaying ? 'Pause song' : 'Play song'} /><button type="button" onClick={() => void toggleFavorite(song)} className={liked ? 'flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold' : 'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/45 hover:border-gold/40 hover:text-gold'} aria-label={liked ? 'Remove favorite' : 'Add favorite'}><Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} /></button><button type="button" onClick={() => { void navigator.clipboard?.writeText(window.location.href); toast.success('Song link copied.'); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/45 hover:border-gold/40 hover:text-gold" aria-label="Share song"><Share2 className="h-4 w-4" /></button></div><div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-white/35 md:justify-start"><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatDuration(song.duration)}</span>{song.genre && <span>{song.genre}</span>}{song.releaseDate && <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(song.releaseDate)}</span>}</div></div></section><div className="grid gap-8 lg:grid-cols-[1fr_300px]"><section className="rounded-[24px] border border-white/[.07] bg-white/[.02] p-6 sm:p-9"><div className="flex items-center justify-between border-b border-white/[.07] pb-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-gold/75">Lyrics</p><h2 className="mt-2 font-display text-2xl font-medium text-white">Sing along</h2></div><Link href={`/lyrics?song=${song.id}`} className="text-xs font-medium text-white/40 hover:text-gold">Open full view →</Link></div>{song.lyrics?.trim() ? <div className="mt-7 max-h-[420px] overflow-hidden text-base leading-8 text-white/70">{song.lyrics.split('\n').slice(0, 16).map((line, index) => <p key={`${index}-${line}`} className="lyric-line min-h-[1.5rem]">{line || '\u00a0'}</p>)}{song.lyrics.split('\n').length > 16 && <Link href={`/lyrics?song=${song.id}`} className="mt-5 inline-block text-sm text-gold hover:text-gold-bright">Read all lyrics →</Link>}</div> : <div className="py-12 text-center text-sm text-white/35">Lyrics haven&apos;t been added for this song yet.</div>}</section><aside className="space-y-4"><div className="rounded-[24px] border border-white/[.07] bg-white/[.02] p-5"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-white/30">About this track</p><p className="mt-4 text-sm leading-7 text-white/55">{song.description || 'A SIMZ NAXTY release. Press play and make the moment yours.'}</p></div><button type="button" onClick={() => setPlaylistOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-xs font-semibold text-white/65 hover:border-gold/40 hover:text-gold"><ListPlus className="h-4 w-4" />Add to playlist</button></aside></div><PlaylistDialog song={song} open={playlistOpen} onClose={() => setPlaylistOpen(false)} /></div>;
}

export function PlaylistDetailPage() {
  const params = useParams();
  const id = idFromParams(params, 'id');
  const { playlists, songs, loading } = useLibrary();
  const { user } = useAuth();
  const { playSong } = useMusic();
  const router = useRouter();
  const [owned, setOwned] = useState<Playlist | undefined>();
  const [saving, setSaving] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  useEffect(() => {
    if (!user) { setOwned(undefined); return; }
    return subscribeCollection<Playlist>('playlists', [firestoreHelpers.where('ownerId', '==', user.uid)], (items) => setOwned(items.find((item) => item.id === id)));
  }, [id, user]);
  const playlist = playlists.find((item) => item.id === id) || owned;
  useEffect(() => { if (playlist) setRenameValue(playlist.name); }, [playlist]);
  const playlistSongs = useMemo(() => playlist ? playlist.songIds.map((songId) => songs.find((song) => song.id === songId)).filter(Boolean) as Song[] : [], [playlist, songs]);
  if (loading && !playlist) return <DetailLoading />;
  if (!playlist) return <EmptyState icon="playlist" title="Playlist not found." description="This playlist may be private or the link may have changed." action={{ label: 'Back to playlists', href: '/playlists' }} />;
  const canEdit = Boolean(user && playlist.ownerId === user.uid);
  const removeSong = async (songId: string) => {
    if (!canEdit) return;
    setSaving(true);
    try { await saveDocument('playlists', playlist.id, { songIds: playlist.songIds.filter((item) => item !== songId), updatedAt: firestoreHelpers.serverTimestamp() }); toast.success('Removed from playlist.'); } catch { toast.error('Could not update the playlist.'); } finally { setSaving(false); }
  };
  const renamePlaylist = async () => {
    if (!canEdit || !renameValue.trim()) return;
    setSaving(true);
    try { await updateDocument('playlists', playlist.id, { name: renameValue.trim(), updatedAt: firestoreHelpers.serverTimestamp() }); toast.success('Playlist renamed.'); setRenameOpen(false); } catch { toast.error('Could not rename the playlist.'); } finally { setSaving(false); }
  };
  const deletePlaylist = async () => {
    if (!canEdit) return;
    setSaving(true);
    try { await removeDocument('playlists', playlist.id); toast.success('Playlist deleted.'); router.push('/playlists'); } catch { toast.error('Could not delete the playlist.'); } finally { setSaving(false); setDeleteOpen(false); }
  };
  return <div className="space-y-10"><BackLink href="/playlists" label="All playlists" /><section className="flex flex-col gap-7 sm:flex-row sm:items-end"><Artwork src={playlist.artworkUrl} title={playlist.name} alt={`${playlist.name} artwork`} size="xl" rounded="rounded-[24px]" className="h-56 w-56 shadow-gold" /><div className="min-w-0"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.24em] text-gold/80">{playlist.featured ? 'Featured playlist' : canEdit ? 'Your playlist' : 'Public playlist'}</p><h1 className="font-display text-4xl font-semibold tracking-[-.045em] text-white md:text-6xl">{playlist.name}</h1>{playlist.description && <p className="mt-4 max-w-xl text-sm leading-6 text-white/45">{playlist.description}</p>}{canEdit && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setRenameOpen((open) => !open)} className="rounded-full border border-white/10 px-3.5 py-2 text-xs font-medium text-white/55 hover:border-gold/40 hover:text-gold">Rename</button><button type="button" onClick={() => setDeleteOpen(true)} className="rounded-full border border-red-300/15 px-3.5 py-2 text-xs font-medium text-red-200/60 hover:border-red-300/40 hover:text-red-200">Delete</button></div>}{renameOpen && <div className="mt-4 flex max-w-md gap-2"><input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void renamePlaylist()} className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-gold/50" /><button type="button" disabled={!renameValue.trim() || saving} onClick={() => void renamePlaylist()} className="rounded-xl bg-gold px-3.5 text-xs font-semibold text-black disabled:opacity-40">Save</button></div>}<div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" disabled={!playlistSongs.length} onClick={() => playlistSongs[0] && playSong(playlistSongs[0], playlistSongs)} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-xs font-semibold text-black disabled:opacity-40"><Play className="h-3.5 w-3.5" fill="currentColor" />Play all</button><span className="text-xs text-white/35">{playlist.songIds.length} songs</span></div></div></section><section><SectionHeading title="Playlist songs" eyebrow="In this set" />{playlistSongs.length ? <div className="divide-y divide-white/[.06] rounded-2xl border border-white/[.06] bg-white/[.015] px-1 py-1">{playlistSongs.map((song) => <div key={song.id} className="flex items-center"><div className="min-w-0 flex-1"><SongRow song={song} queue={playlistSongs} /></div>{canEdit && <button type="button" disabled={saving} onClick={() => void removeSong(song.id)} className="mr-3 rounded-lg p-2 text-white/25 hover:bg-red-400/10 hover:text-red-300" aria-label={`Remove ${song.title}`}><Trash2 className="h-4 w-4" /></button>}</div>)}</div> : <EmptyState icon="playlist" title="This playlist is empty." description={canEdit ? 'Add songs from any song card to start shaping it.' : 'There are no published songs in this playlist yet.'} />}</section><ConfirmDialog open={deleteOpen} title="Delete this playlist?" description={`“${playlist.name}” and its song order will be removed from your library.`} onClose={() => setDeleteOpen(false)} onConfirm={() => void deletePlaylist()} /></div>;
}

function BackLink({ href, label }: { href: string; label: string }) { return <Link href={href} className="inline-flex items-center gap-2 text-xs font-medium text-white/40 transition hover:text-gold"><ArrowLeft className="h-4 w-4" />{label}</Link>; }
function DetailLoading() { return <div className="space-y-8"><div className="h-4 w-28 animate-pulse rounded bg-white/[.06]" /><div className="grid gap-7 rounded-[28px] bg-white/[.04] p-7 md:grid-cols-[280px_1fr]"><div className="aspect-square animate-pulse rounded-2xl bg-white/[.06]" /><div className="space-y-4 self-end"><div className="h-3 w-20 animate-pulse rounded bg-white/[.06]" /><div className="h-12 w-2/3 animate-pulse rounded bg-white/[.06]" /><div className="h-4 w-1/3 animate-pulse rounded bg-white/[.04]" /></div></div></div>; }
