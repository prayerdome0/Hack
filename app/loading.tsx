import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return <div className="space-y-10"><div className="space-y-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-10 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div><Skeleton className="h-[300px] w-full rounded-[28px]" /><div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Skeleton className="aspect-square rounded-2xl" /><Skeleton className="aspect-square rounded-2xl" /><Skeleton className="aspect-square rounded-2xl" /><Skeleton className="aspect-square rounded-2xl" /></div></div>;
}
