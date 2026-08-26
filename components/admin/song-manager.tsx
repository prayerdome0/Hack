'use client';

import Link from 'next/link';
import { Edit3, FileAudio, Filter, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { createDocument, removeDocument, updateDocument, firestoreHelpers } from '@/lib/firestore';
import { uploadToCloudinary } from '@/lib/cloudinary-client';
import type { Album, Artist, Song } from '@/lib/types';
import { formatDate, formatDuration } from '@/lib/utils';
import { Artwork } from '@/components/ui/artwork';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { AdminCard, AdminGuard, AdminHeading, FormField, inputClass, textareaClass, useAdminCollection } from '@/components/admin/admin-shared';

export function SongManagerPage() { return <AdminGuard><SongManager /></AdminGuard>; }

type SongFormValues = {
  title: string; artistId: string; artistName: string; albumId: string; albumName: string; genre: string; releaseDate: string; description: string; lyrics: string; featured: boolean; published: boolean;
};
const blank: SongFormValues = { title: '', artistId: '', artistName: '', albumId: '', albumName: '', genre: '', releaseDate: '', description: '', lyrics: '', featured: false, published: true };

function SongManager() {
  const { user } = useAuth();
  const { items, loading, error } = useAdminCollection<Song & Record<string, unknown>>('songs');
  const artists = useAdminCollection<Artist & Record<string, unknown>>('artists');
  const albums = useAdminCollection<Album & Record<string, unknown>>('albums');
  const [search, setSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Song | undefined>();
  const [deleting, setDeleting] = useState<Song | undefined>();
  const filtered = useMemo(() => items.filter((song) => {
    const matchesText = `${song.title} ${song.artistName} ${song.albumName || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase());
    const matchesStatus = publishedFilter === 'all' || (publishedFilter === 'published' ? song.published : !song.published);
    return matchesText && matchesStatus;
  }), [items, search, publishedFilter]);
  const deleteSong = async () => {
    if (!deleting) return;
    try {
      await removeDocument('songs', deleting.id);
      if (user && (deleting.coverPublicId || deleting.audioPublicId)) {
        const token = await user.getIdToken();
        await Promise.allSettled([
          deleting.coverPublicId ? destroyMedia(deleting.coverPublicId, 'image', token) : Promise.resolve(),
          deleting.audioPublicId ? destroyMedia(deleting.audioPublicId, 'video', token) : Promise.resolve()
        ]);
      }
      toast.success('Song deleted from the catalog.');
    } catch { toast.error('Could not delete this song.'); } finally { setDeleting(undefined); }
  };
  return <div className="space-y-7"><AdminHeading title="Songs" description="Upload, edit and curate every track in the public catalog." action={<button type="button" onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-xs font-semibold text-black hover:bg-gold-bright"><Plus className="h-3.5 w-3.5" />Upload song</button>} /><AdminCard className="p-3"><div className="flex flex-col gap-3 md:flex-row"><div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><Search className="h-4 w-4 text-white/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, artist or album" className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25" /></div><div className="flex items-center gap-2 overflow-x-auto"><Filter className="h-4 w-4 shrink-0 text-white/30" />{(['all', 'published', 'draft'] as const).map((filter) => <button type="button" key={filter} onClick={() => setPublishedFilter(filter)} className={publishedFilter === filter ? 'shrink-0 rounded-lg bg-gold px-3 py-2 text-xs font-semibold capitalize text-black' : 'shrink-0 rounded-lg px-3 py-2 text-xs capitalize text-white/40 hover:bg-white/[.06] hover:text-white'}>{filter}</button>)}</div></div></AdminCard>{error && <div className="rounded-xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-xs text-red-200">Could not read admin songs: {error}</div>}<AdminCard>{loading ? <div className="p-6 text-sm text-white/40">Loading song catalog…</div> : filtered.length ? <div className="divide-y divide-white/[.06]"><div className="hidden grid-cols-[minmax(0,1.7fr)_minmax(100px,.7fr)_100px_90px_70px] gap-4 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.18em] text-white/25 md:grid"><span>Song</span><span>Album</span><span>Duration</span><span>Status</span><span /></div>{filtered.map((song) => <div key={song.id} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[.025] md:grid md:grid-cols-[minmax(0,1.7fr)_minmax(100px,.7fr)_100px_90px_70px] md:gap-4 md:px-5"><div className="flex min-w-0 flex-1 items-center gap-3"><Artwork src={song.coverUrl} title={song.title} alt="" size="sm" rounded="rounded-xl" /><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{song.title}</p><p className="mt-1 truncate text-xs text-white/35">{song.artistName}{song.genre ? ` · ${song.genre}` : ''}</p></div></div><span className="hidden truncate text-xs text-white/45 md:block">{song.albumName || 'Single'}</span><span className="hidden text-xs tabular-nums text-white/35 md:block">{formatDuration(song.duration)}</span><span className={song.published ? 'hidden w-fit rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-200 md:block' : 'hidden w-fit rounded-full bg-white/[.07] px-2 py-1 text-[10px] text-white/35 md:block'}>{song.published ? 'Live' : 'Draft'}</span><div className="flex items-center gap-1"><button type="button" onClick={() => { setEditing(song); setEditorOpen(true); }} className="rounded-lg p-2 text-white/35 hover:bg-gold/10 hover:text-gold" aria-label={`Edit ${song.title}`}><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => setDeleting(song)} className="rounded-lg p-2 text-white/30 hover:bg-red-400/10 hover:text-red-300" aria-label={`Delete ${song.title}`}><Trash2 className="h-4 w-4" /></button></div></div>)}</div> : <div className="px-5 py-16 text-center"><FileAudio className="mx-auto h-8 w-8 text-white/20" /><p className="mt-3 text-sm text-white/45">{search || publishedFilter !== 'all' ? 'No songs match these filters.' : 'No songs yet. Upload the first release.'}</p><button type="button" onClick={() => { setEditing(undefined); setEditorOpen(true); }} className="mt-4 text-xs font-semibold text-gold hover:text-gold-bright">Upload a song →</button></div>}</AdminCard><SongEditor open={editorOpen} song={editing} artists={artists.items} albums={albums.items} onClose={() => setEditorOpen(false)} onSaved={() => setEditorOpen(false)} /><ConfirmDialog open={Boolean(deleting)} title="Delete this song?" description={`“${deleting?.title}” will be removed from the catalog. This cannot be undone.`} onClose={() => setDeleting(undefined)} onConfirm={() => void deleteSong()} /></div>;
}

function SongEditor({ open, song, artists, albums, onClose, onSaved }: { open: boolean; song?: Song; artists: (Artist & Record<string, unknown>)[]; albums: (Album & Record<string, unknown>)[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [values, setValues] = useState<SongFormValues>(blank);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ audio?: number; cover?: number }>({});
  const [saving, setSaving] = useState(false);
  // Reset the form whenever the editor opens for a different song.
  useEffect(() => {
    if (!open) return;
    setValues(song ? { title: song.title, artistId: song.artistId || '', artistName: song.artistName, albumId: song.albumId || '', albumName: song.albumName || '', genre: song.genre || '', releaseDate: song.releaseDate || '', description: song.description || '', lyrics: song.lyrics || '', featured: Boolean(song.featured), published: song.published !== false } : { ...blank });
    setAudioFile(null);
    setCoverFile(null);
    setProgress({});
  }, [open, song]);
  if (!open) return null;
  const set = (key: keyof SongFormValues, value: string | boolean) => setValues((old) => ({ ...old, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!values.title.trim() || !values.artistName.trim()) { toast.error('Title and artist are required.'); return; }
    if (!song && !audioFile) { toast.error('Choose an audio file to upload.'); return; }
    if (!song && !coverFile) { toast.error('Choose cover artwork to upload.'); return; }
    setSaving(true);
    try {
      const token = await user.getIdToken();
      let audioUrl = song?.audioUrl || '';
      let audioPublicId = song?.audioPublicId;
      let duration = song?.duration || 0;
      let coverUrl = song?.coverUrl || '';
      let coverPublicId = song?.coverPublicId;
      if (audioFile) {
        validateFile(audioFile, 'audio');
        const result = await uploadToCloudinary(audioFile, 'simz-naxty/audio', token, (value) => setProgress((old) => ({ ...old, audio: value })));
        audioUrl = result.secure_url; audioPublicId = result.public_id; duration = result.duration || duration;
      }
      if (coverFile) {
        validateFile(coverFile, 'image');
        const result = await uploadToCloudinary(coverFile, 'simz-naxty/covers', token, (value) => setProgress((old) => ({ ...old, cover: value })));
        coverUrl = result.secure_url; coverPublicId = result.public_id;
      }
      if (!audioUrl || !coverUrl) throw new Error('Audio and cover artwork are required.');
      const data = { ...values, title: values.title.trim(), artistName: values.artistName.trim(), albumName: values.albumName.trim() || '', audioUrl, audioPublicId, coverUrl, coverPublicId, duration, playCount: song?.playCount || 0, updatedAt: firestoreHelpers.serverTimestamp() };
      if (song) await updateDocument('songs', song.id, data);
      else await createDocument('songs', { ...data, createdAt: firestoreHelpers.serverTimestamp() });
      toast.success(song ? 'Song updated.' : values.published ? 'Song uploaded and published.' : 'Song saved as a draft.');
      onSaved();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save this song.'); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6"><div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[#151515] shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[.08] bg-[#151515]/95 px-5 py-4 backdrop-blur sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold/75">Song studio</p><h2 className="mt-1 font-display text-xl font-semibold text-white">{song ? 'Edit song' : 'Upload a new song'}</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white" aria-label="Close song editor"><X className="h-5 w-5" /></button></div><form onSubmit={submit} className="space-y-7 p-5 sm:p-7"><div className="grid gap-5 md:grid-cols-2"><FormField label="Song title"><input required value={values.title} onChange={(event) => set('title', event.target.value)} className={inputClass} placeholder="Enter the track title" /></FormField><FormField label="Genre"><input value={values.genre} onChange={(event) => set('genre', event.target.value)} className={inputClass} placeholder="e.g. Afrobeat, R&B" /></FormField><FormField label="Artist" hint="Use the ID when an artist profile already exists."><div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2"><input required value={values.artistName} onChange={(event) => set('artistName', event.target.value)} list="artist-options" className={inputClass} placeholder="Artist name" /><select value={values.artistId} onChange={(event) => { const artist = artists.find((item) => item.id === event.target.value); setValues((old) => ({ ...old, artistId: event.target.value, artistName: artist?.name || old.artistName })); }} className={inputClass}><option value="">Profile ID</option>{artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></div><datalist id="artist-options">{artists.map((artist) => <option key={artist.id} value={artist.name} />)}</datalist></FormField><FormField label="Album"><div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2"><input value={values.albumName} onChange={(event) => set('albumName', event.target.value)} list="album-options" className={inputClass} placeholder="Single / album name" /><select value={values.albumId} onChange={(event) => { const album = albums.find((item) => item.id === event.target.value); setValues((old) => ({ ...old, albumId: event.target.value, albumName: album?.title || old.albumName, artistName: album?.artistName || old.artistName })); }} className={inputClass}><option value="">Album ID</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}</select></div><datalist id="album-options">{albums.map((album) => <option key={album.id} value={album.title} />)}</datalist></FormField><FormField label="Release date"><input type="date" value={values.releaseDate} onChange={(event) => set('releaseDate', event.target.value)} className={inputClass} /></FormField><FormField label="Description"><textarea value={values.description} onChange={(event) => set('description', event.target.value)} className={textareaClass} placeholder="A short note about the release" /></FormField></div><div className="grid gap-5 md:grid-cols-2"><FormField label="Audio file" hint={song ? 'Leave blank to keep the existing audio.' : 'MP3, WAV, M4A or OGG. Audio is stored securely in Cloudinary.'}><FileDropzone accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/ogg,audio/*" label={song ? 'Replace audio file' : 'Choose an audio file'} hint="Up to 200 MB" type="audio" file={audioFile} onChange={setAudioFile} progress={progress.audio} />{song?.audioUrl && !audioFile && <p className="mt-2 truncate text-[10px] text-emerald-300/60">Existing audio is attached · {formatDuration(song.duration)}</p>}</FormField><FormField label="Cover artwork" hint={song ? 'Leave blank to keep the existing artwork.' : 'JPG, PNG or WEBP. A square cover looks best.'}><FileDropzone accept="image/jpeg,image/png,image/webp" label={song ? 'Replace artwork' : 'Choose cover artwork'} hint="Up to 10 MB" type="image" file={coverFile} onChange={setCoverFile} progress={progress.cover} />{song?.coverUrl && !coverFile && <p className="mt-2 text-[10px] text-emerald-300/60">Existing artwork is attached</p>}</FormField></div><FormField label="Lyrics" hint="Plain text is supported now; the schema leaves room for synchronized lines later."><textarea value={values.lyrics} onChange={(event) => set('lyrics', event.target.value)} className={`${textareaClass} min-h-[190px]`} placeholder="Paste lyrics here, one line at a time…" /></FormField><div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><div className="flex flex-wrap gap-5"><Toggle label="Published" checked={values.published} onChange={(value) => set('published', value)} /><Toggle label="Featured" checked={values.featured} onChange={(value) => set('featured', value)} /></div><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/55 hover:bg-white/[.05]">Cancel</button><button type="submit" disabled={saving} className="inline-flex min-w-[128px] items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-black hover:bg-gold-bright disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Saving…' : song ? 'Save changes' : 'Upload song'}</button></div></div></form></div></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-2.5 text-xs text-white/60"><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={checked ? 'relative h-5 w-9 rounded-full bg-gold transition' : 'relative h-5 w-9 rounded-full bg-white/15 transition'}><span className={checked ? 'absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-black transition' : 'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white/60 transition'} /></button>{label}</label>; }
function validateFile(file: File, type: 'audio' | 'image') { if (type === 'audio' && !file.type.startsWith('audio/') && file.type !== 'video/mp4') throw new Error('Choose a supported audio file.'); if (type === 'image' && !file.type.startsWith('image/')) throw new Error('Choose a valid image file.'); if (type === 'audio' && file.size > 200 * 1024 * 1024) throw new Error('Audio files must be smaller than 200 MB.'); if (type === 'image' && file.size > 10 * 1024 * 1024) throw new Error('Artwork must be smaller than 10 MB.'); }
async function destroyMedia(publicId: string, resourceType: 'image' | 'video', token: string) { await fetch('/api/cloudinary/destroy', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ publicId, resourceType }) }); }
