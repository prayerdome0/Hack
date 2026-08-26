import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function SectionHeading({ title, eyebrow, href, action = 'View all' }: { title: string; eyebrow?: string; href?: string; action?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.24em] text-gold/80">{eyebrow}</p>}
        <h2 className="font-display text-xl font-semibold tracking-[-.02em] text-white md:text-2xl">{title}</h2>
      </div>
      {href && <Link href={href} className="group flex shrink-0 items-center gap-1.5 text-xs font-medium text-white/45 transition hover:text-gold">{action}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></Link>}
    </div>
  );
}
