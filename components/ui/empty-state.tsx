import { Compass, Heart, LibraryBig, ListMusic, Music2, SearchX } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const icons = { music: Music2, search: SearchX, heart: Heart, playlist: ListMusic, library: LibraryBig, compass: Compass };

export function EmptyState({
  icon = 'music',
  title = 'No music yet. Check back soon.',
  description,
  action,
  className
}: {
  icon?: keyof typeof icons;
  title?: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  const Icon = icons[icon];
  return (
    <div className={cn('flex min-h-[230px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/[.12] bg-white/[.025] px-6 py-12 text-center', className)}>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold/[.08] text-gold">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-medium text-white">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-white/45">{description}</p>}
      {action && <Link href={action.href} className="mt-5 rounded-full bg-gold px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-gold-bright">{action.label}</Link>}
    </div>
  );
}

export function InlineEmpty({ text = 'Nothing to show here yet.' }: { text?: string }) {
  return <p className="rounded-2xl border border-dashed border-white/[.1] px-5 py-7 text-center text-sm text-white/40">{text}</p>;
}
