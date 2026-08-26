import { Loader2, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PlayButton({ playing = false, loading = false, onClick, size = 'md', label }: { playing?: boolean; loading?: boolean; onClick?: () => void; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' };
  return (
    <button type="button" onClick={onClick} aria-label={label || (playing ? 'Pause' : 'Play')} className={cn('flex shrink-0 items-center justify-center rounded-full bg-gold text-black transition hover:scale-105 hover:bg-gold-bright focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-ink', sizes[size], size === 'lg' && 'animate-pulse-gold')}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className={cn(size === 'lg' ? 'h-6 w-6' : 'h-4 w-4')} fill="currentColor" /> : <Play className={cn(size === 'lg' ? 'ml-1 h-6 w-6' : 'ml-0.5 h-4 w-4')} fill="currentColor" />}
    </button>
  );
}
