import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ArtistAvatar } from '@/components/ui/artist-avatar';
import type { Artist } from '@/lib/types';

export function ArtistCard({ artist }: { artist: Artist }) {
  return <Link href={`/artist/${artist.id}`} className="group flex min-w-[124px] flex-col items-center rounded-2xl p-2 text-center transition hover:bg-white/[.04] sm:min-w-0"><ArtistAvatar name={artist.name} src={artist.profileImage} size="lg" className="h-28 w-28 transition duration-500 group-hover:scale-105 md:h-36 md:w-36" /><span className="mt-3 line-clamp-1 w-full text-sm font-semibold text-white group-hover:text-gold">{artist.name}</span>{artist.genre && <span className="mt-1 text-xs text-white/35">{artist.genre}</span>}<span className="mt-2 flex items-center gap-1 text-[10px] uppercase tracking-[.15em] text-white/25 opacity-0 transition group-hover:opacity-100">View <ArrowUpRight className="h-3 w-3" /></span></Link>;
}
