'use client';

import { usePathname } from 'next/navigation';
import { Sidebar, MobileNav } from '@/components/chrome/sidebar';
import { Header } from '@/components/chrome/header';
import { MusicPlayer } from '@/components/chrome/music-player';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === '/login';
  if (bare) return <main className="min-h-screen bg-ink">{children}</main>;
  return <div className="min-h-screen bg-ink text-white"><Sidebar /><div className={cn('min-h-screen md:pl-[245px]')}><Header /><main className="page-enter mx-auto max-w-[1500px] px-4 pb-36 pt-7 sm:px-6 md:px-9 md:pt-10">{children}</main></div><MobileNav /><MusicPlayer /></div>;
}
