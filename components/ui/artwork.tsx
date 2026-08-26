import Image from 'next/image';
import { Disc3, Music2 } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';

export function Artwork({
  src,
  alt = '',
  title,
  size = 'md',
  rounded = 'rounded-2xl',
  className
}: {
  src?: string;
  alt?: string;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: string;
  className?: string;
}) {
  const sizeClasses = { xs: 'h-10 w-10', sm: 'h-12 w-12', md: 'h-16 w-16', lg: 'h-48 w-48', xl: 'h-72 w-72' };
  return (
    <div className={cn('artwork relative shrink-0 overflow-hidden bg-[#1c1a16]', sizeClasses[size], rounded, className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes="(max-width: 768px) 25vw, 220px" className="object-cover" unoptimized />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(215,181,109,.35),transparent_45%),linear-gradient(145deg,#302514,#0e0e0e_70%)] text-gold">
          <span className="font-display text-xs font-semibold tracking-wider text-gold/80">{getInitials(title)}</span>
          <Music2 className="mt-1 h-5 w-5 opacity-70" strokeWidth={1.5} />
        </div>
      )}
      {src && <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />}
    </div>
  );
}

export function AlbumArtwork({ src, alt = '', title, className }: { src?: string; alt?: string; title?: string; className?: string }) {
  return <Artwork src={src} alt={alt} title={title} size="lg" rounded="rounded-[22px]" className={className} />;
}

export function VinylIcon({ className }: { className?: string }) {
  return <Disc3 className={cn('h-5 w-5', className)} />;
}
