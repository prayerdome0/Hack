'use client';

import Link from 'next/link';
import { Bell, ChevronLeft, ChevronRight, LogIn, Search, UserRound } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Logo } from '@/components/ui/logo';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  return <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-3 border-b border-white/[.06] bg-ink/80 px-4 backdrop-blur-xl md:px-9"><div className="flex items-center gap-3 md:hidden"><Logo compact /></div><div className="hidden items-center gap-2 md:flex"><button type="button" onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[.08] text-white/40 transition hover:border-white/20 hover:text-white" aria-label="Go back"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => router.forward()} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[.08] text-white/40 transition hover:border-white/20 hover:text-white" aria-label="Go forward"><ChevronRight className="h-4 w-4" /></button></div><div className="flex flex-1 justify-center md:justify-end"><Link href="/search" className="flex w-full max-w-[360px] items-center gap-2.5 rounded-full border border-white/[.09] bg-white/[.035] px-4 py-2.5 text-sm text-white/35 transition hover:border-gold/30 hover:text-white/60"><Search className="h-4 w-4" /><span>Search your sound...</span><kbd className="ml-auto hidden rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/25 lg:inline">⌘ K</kbd></Link></div><div className="ml-3 flex items-center gap-2 md:ml-5"><button type="button" className="hidden h-9 w-9 items-center justify-center rounded-full text-white/40 hover:bg-white/[.05] hover:text-white sm:flex" aria-label="Notifications"><Bell className="h-4 w-4" /></button>{user ? <Link href="/favorites" className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-xs font-semibold text-gold" aria-label={`Open ${profile?.displayName || 'your'} favorites`}>{(profile?.displayName || user.email || 'SN').slice(0, 1).toUpperCase()}</Link> : <Link href="/login" className="flex items-center gap-2 rounded-full bg-gold px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-gold-bright"><UserRound className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sign in</span></Link>}</div></header>;
}
