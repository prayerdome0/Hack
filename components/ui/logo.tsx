import Image from 'next/image';
import Link from 'next/link';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="SIMZ NAXTY home">
      <Image src="/logo.svg" alt="" width={compact ? 36 : 42} height={compact ? 36 : 42} priority className="animate-float shrink-0 transition-transform duration-300 group-hover:rotate-[-5deg]" />
      {!compact && <span className="font-display text-[15px] font-semibold tracking-[0.22em] text-white">SIMZ <span className="text-gold">NAXTY</span></span>}
    </Link>
  );
}
