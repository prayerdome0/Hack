import Image from 'next/image';
import { UserRound } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';

export function ArtistAvatar({ name, src, size = 'md', className }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const classes = { sm: 'h-11 w-11 text-xs', md: 'h-16 w-16 text-sm', lg: 'h-32 w-32 text-2xl' };
  return (
    <div className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/20 bg-[#211d15] font-display font-semibold text-gold', classes[size], className)}>
      {src ? <Image src={src} alt={name} fill sizes="160px" className="object-cover" unoptimized /> : <><span>{getInitials(name)}</span><UserRound className="absolute bottom-1 right-1 h-3 w-3 opacity-30" /></>}
    </div>
  );
}
