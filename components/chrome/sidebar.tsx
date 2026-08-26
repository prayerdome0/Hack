'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Heart, Home, Library, ListMusic, LogIn, LogOut, Mic2, Music2, PanelLeft, Search, Settings2, Shield, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';

const mainLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/songs', label: 'Songs', icon: Music2 },
  { href: '/artists', label: 'Artists', icon: Mic2 },
  { href: '/albums', label: 'Albums', icon: Library },
  { href: '/playlists', label: 'Playlists', icon: ListMusic }
];
const personalLinks = [
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/recently-played', label: 'Recently played', icon: PanelLeft },
  { href: '/lyrics', label: 'Lyrics', icon: Settings2 }
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOut, configured } = useAuth();
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  return <aside className="fixed inset-y-0 left-0 z-40 hidden w-[245px] flex-col border-r border-white/[.07] bg-ink/95 px-5 py-6 md:flex"><div className="px-2"><Logo /></div><div className="mt-10 flex-1 overflow-y-auto pr-1"><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.22em] text-white/25">Browse</p><nav className="space-y-1">{mainLinks.map(({ href, label, icon: Icon }) => <NavLink key={href} href={href} label={label} icon={<Icon className="h-[17px] w-[17px]" />} active={isActive(href)} />)}</nav><p className="mb-3 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[.22em] text-white/25">Your space</p><nav className="space-y-1">{personalLinks.map(({ href, label, icon: Icon }) => <NavLink key={href} href={href} label={label} icon={<Icon className="h-[17px] w-[17px]" />} active={isActive(href)} />)}</nav>{profile?.role === 'admin' && <><p className="mb-3 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[.22em] text-white/25">Workspace</p><NavLink href="/admin" label="Admin studio" icon={<Shield className="h-[17px] w-[17px]" />} active={pathname.startsWith('/admin')} /></>}</div><div className="border-t border-white/[.07] pt-4">{user ? <div className="flex items-center gap-3 rounded-2xl bg-white/[.04] p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-display text-xs font-semibold text-gold">{(profile?.displayName || user.email || 'SN').slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{profile?.displayName || 'Listener'}</p><p className="truncate text-[10px] text-white/35">{user.email}</p></div><button type="button" onClick={() => void signOut().then(() => toast.success('Signed out safely.'))} className="rounded-lg p-1.5 text-white/35 hover:bg-white/10 hover:text-white" aria-label="Sign out"><LogOut className="h-4 w-4" /></button></div> : <Link href="/login" className="flex items-center justify-center gap-2 rounded-xl border border-gold/30 px-3 py-3 text-xs font-semibold text-gold transition hover:bg-gold/10"><LogIn className="h-4 w-4" />Sign in to sync</Link>}{!configured && <p className="mt-3 px-1 text-[10px] leading-4 text-white/25">Connect Firebase in your environment to sync the library.</p>}</div></aside>;
}

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return <Link href={href} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition', active ? 'bg-gold/10 font-medium text-gold' : 'text-white/45 hover:bg-white/[.045] hover:text-white')}><span className={cn('transition', active ? 'text-gold' : 'text-white/35 group-hover:text-white/70')}>{icon}</span>{label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}</Link>;
}

export function MobileNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const links = [{ href: '/', label: 'Home', icon: Home }, { href: '/discover', label: 'Discover', icon: Compass }, { href: '/songs', label: 'Songs', icon: Music2 }, { href: '/playlists', label: 'Library', icon: ListMusic }, { href: profile?.role === 'admin' ? '/admin' : '/favorites', label: profile?.role === 'admin' ? 'Studio' : 'Saved', icon: profile?.role === 'admin' ? Shield : Heart }];
  return <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[72px] items-center justify-around border-t border-white/[.08] bg-[#0b0b0b]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">{links.map(({ href, label, icon: Icon }) => { const active = href === '/' ? pathname === '/' : pathname.startsWith(href); return <Link href={href} key={href} className={cn('flex min-w-[52px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] transition', active ? 'text-gold' : 'text-white/40')}><Icon className="h-[18px] w-[18px]" /><span>{label}</span></Link>; })}</nav>;
}
