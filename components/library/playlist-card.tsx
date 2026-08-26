import Link from 'next/link';
import { ListMusic } from 'lucide-react';
import { Artwork } from '@/components/ui/artwork';
import type { Playlist } from '@/lib/types';

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return <Link href={`/playlist/${playlist.id}`} className="page-enter group min-w-0"><div className="relative overflow-hidden rounded-2xl"><Artwork src={playlist.artworkUrl} title={playlist.name} alt={`${playlist.name} artwork`} size="lg" rounded="rounded-2xl" className="h-auto w-full aspect-square transition duration-500 group-hover:scale-[1.03]" /><div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-gold backdrop-blur"><ListMusic className="h-4 w-4" /></div></div><h3 className="mt-3 truncate text-sm font-semibold text-white group-hover:text-gold">{playlist.name}</h3><p className="mt-1 truncate text-xs text-white/40">{playlist.songIds?.length || 0} songs</p></Link>;
}
