import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-white/[.07]', className)} />;
}

export function CardSkeleton() {
  return <div className="space-y-3"><Skeleton className="aspect-square w-full rounded-2xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>;
}
