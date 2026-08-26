import Link from 'next/link';
import { Disc3 } from 'lucide-react';
import { Artwork } from '@/components/ui/artwork';
import type { Album } from '@/lib/types';

export function AlbumCard({ album }: { album: Album }) {
  return <Link href={`/album/${album.id}`} className="group min-w-0"><div className="overflow-hidden rounded-2xl"><Artwork src={album.coverUrl} title={album.title} alt={`${album.title} cover`} size="lg" rounded="rounded-2xl" className="h-auto w-full aspect-square transition duration-500 group-hover:scale-[1.03]" /></div><h3 className="mt-3 truncate text-sm font-semibold text-white group-hover:text-gold">{album.title}</h3><p className="mt-1 flex items-center gap-1.5 truncate text-xs text-white/40"><Disc3 className="h-3 w-3" />{album.artistName}</p></Link>;
}
