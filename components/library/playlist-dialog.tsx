'use client';

import { Check, ListPlus, Loader2, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { subscribeCollection, saveDocument, firestoreHelpers } from '@/lib/firestore';
import type { Playlist, Song } from '@/lib/types';

export function PlaylistDialog({ song, open, onClose }: { song: Song | null; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    return subscribeCollection<Playlist>('playlists', [firestoreHelpers.where('ownerId', '==', user.uid)], setPlaylists);
  }, [open, user]);

  if (!open || !song) return null;

  const addToPlaylist = async (playlist: Playlist) => {
    if (!user) return;
    if (playlist.songIds?.includes(song.id)) {
      toast.message('That song is already in this playlist.');
      return;
    }
    setSaving(true);
    try {
      await saveDocument('playlists', playlist.id, { songIds: [...(playlist.songIds || []), song.id], updatedAt: firestoreHelpers.serverTimestamp() });
      toast.success(`Added to ${playlist.name}.`);
      onClose();
    } catch {
      toast.error('Could not update this playlist.');
    } finally {
      setSaving(false);
    }
  };

  const createPlaylist = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const id = `${user.uid}_${Date.now()}`;
      await saveDocument('playlists', id, { name: name.trim(), description: '', songIds: [song.id], ownerId: user.uid, ownerName: user.displayName || user.email?.split('@')[0] || 'Listener', isPublic: false, featured: false, createdAt: firestoreHelpers.serverTimestamp(), updatedAt: firestoreHelpers.serverTimestamp() });
      toast.success(`Created ${name.trim()}.`);
      setName('');
      onClose();
    } catch {
      toast.error('Could not create your playlist.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="playlist-dialog-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151515] p-5 shadow-2xl">
      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold"><ListPlus className="h-5 w-5" /></div><div><h2 id="playlist-dialog-title" className="font-display text-lg font-semibold text-white">Add to playlist</h2><p className="max-w-[250px] truncate text-xs text-white/40">{song.title}</p></div></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button></div>
      <div className="mt-5 space-y-2">{user ? playlists.map((playlist) => <button key={playlist.id} type="button" disabled={saving} onClick={() => void addToPlaylist(playlist)} className="flex w-full items-center justify-between rounded-xl border border-white/[.08] px-3.5 py-3 text-left transition hover:border-gold/30 hover:bg-gold/[.05]"><span><span className="block text-sm font-medium text-white/85">{playlist.name}</span><span className="mt-0.5 block text-xs text-white/35">{playlist.songIds?.length || 0} songs</span></span>{playlist.songIds?.includes(song.id) ? <Check className="h-4 w-4 text-gold" /> : <Plus className="h-4 w-4 text-white/40" />}</button>) : <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/45">Sign in to create playlists.</p>}{user && playlists.length === 0 && <p className="px-2 text-xs text-white/35">Create your first playlist below.</p>}</div>
      {user && <div className="mt-5 border-t border-white/[.08] pt-5"><label className="mb-2 block text-xs font-semibold uppercase tracking-[.18em] text-white/40">New playlist</label><div className="flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void createPlaylist()} placeholder="Give it a name" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold/50" /><button type="button" disabled={!name.trim() || saving} onClick={() => void createPlaylist()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-black disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}</button></div></div>}
    </div>
  </div>;
}

export function CreatePlaylistButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  if (!user) return null;
  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const id = `${user.uid}_${Date.now()}`;
      await saveDocument('playlists', id, { name: name.trim(), description: description.trim(), songIds: [], ownerId: user.uid, ownerName: user.displayName || user.email?.split('@')[0] || 'Listener', isPublic: false, featured: false, createdAt: firestoreHelpers.serverTimestamp(), updatedAt: firestoreHelpers.serverTimestamp() });
      toast.success(`Created ${name.trim()}.`);
      setName(''); setDescription(''); setOpen(false);
    } catch { toast.error('Could not create your playlist.'); } finally { setSaving(false); }
  };
  return <><button type="button" onClick={() => setOpen(true)} className="inline-flex w-fit items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-gold-bright"><Plus className="h-3.5 w-3.5" />New playlist</button>{open && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-playlist-title" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151515] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold/75">Your library</p><h2 id="create-playlist-title" className="mt-2 font-display text-2xl font-semibold text-white">Create a playlist</h2><p className="mt-2 text-sm text-white/40">Start with a mood. Add songs whenever you find them.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button></div><div className="mt-6 space-y-4"><label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void create()} placeholder="Late night, Sunday morning…" className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold/50" /></label><label className="block"><span className="mb-2 block text-xs font-medium text-white/60">Description <span className="text-white/25">(optional)</span></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this set for?" className="min-h-[90px] w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold/50" /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/55 hover:bg-white/[.05]">Cancel</button><button type="button" disabled={!name.trim() || saving} onClick={() => void create()} className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Creating…' : 'Create playlist'}</button></div></div></div>}</>;
}
