'use client';

import Link from 'next/link';
import { BarChart3, ChevronRight, FileAudio, LayoutDashboard, Library, ListMusic, Mic2, Settings, ShieldCheck, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { subscribeCollection } from '@/lib/firestore';
import { cn } from '@/lib/utils';

const adminLinks = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/songs', label: 'Songs', icon: FileAudio },
  { href: '/admin/artists', label: 'Artists', icon: Mic2 },
  { href: '/admin/albums', label: 'Albums', icon: Library },
  { href: '/admin/playlists', label: 'Playlists', icon: ListMusic },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings }
];

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, configured, isAdmin } = useAuth();
  const [waited, setWaited] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setWaited(true), 8000); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (!loading && !user) router.replace('/login'); else if (!loading && user && !isAdmin && waited) router.replace('/'); }, [loading, user, isAdmin, router, waited]);
  if (!configured) return <AccessMessage title="Admin studio needs Firebase." body="Connect Firebase Authentication, Firestore and a trusted admin profile to continue." />;
  if (loading || (user && !isAdmin && !waited)) return <div className="flex min-h-[55vh] items-center justify-center"><div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-gold/30 border-t-gold" /><p className="mt-4 text-sm text-white/45">Verifying studio access…</p></div></div>;
  if (!user || !isAdmin) return <AccessMessage title="Admin access required." body="This workspace is restricted to trusted SIMZ NAXTY administrators." />;
  return <>{children}</>;
}

function AccessMessage({ title, body }: { title: string; body: string }) { return <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold"><ShieldCheck className="h-7 w-7" /></div><h1 className="mt-6 font-display text-2xl font-semibold text-white">{title}</h1><p className="mt-3 text-sm leading-6 text-white/45">{body}</p><Link href="/" className="mt-6 rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold text-white/70 hover:border-gold/40 hover:text-white">Back to app</Link></div>; }

export function AdminNav() {
  const pathname = usePathname();
  const { isAdmin, loading } = useAuth();
  if (loading || !isAdmin) return null;
  return <div className="-mx-1 overflow-x-auto border-b border-white/[.08] pb-1"><div className="flex min-w-max items-center gap-1">{adminLinks.map(({ href, label, icon: Icon }) => { const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href); return <Link href={href} key={href} className={cn('flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium transition', active ? 'bg-gold/10 text-gold' : 'text-white/40 hover:bg-white/[.05] hover:text-white')}><Icon className="h-3.5 w-3.5" />{label}</Link>; })}</div></div>;
}

export function AdminHeading({ eyebrow = 'Admin studio', title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.24em] text-gold/80"><BarChart3 className="h-3.5 w-3.5" />{eyebrow}</p><h1 className="font-display text-3xl font-semibold tracking-[-.04em] text-white md:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">{description}</p>}</div>{action}</div>;
}

export function AdminCard({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cn('rounded-2xl border border-white/[.08] bg-white/[.025]', className)}>{children}</div>; }

export function StatCard({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string | number; detail?: string; icon: React.ComponentType<{ className?: string }>; accent?: boolean }) {
  return <AdminCard className={cn('p-5', accent && 'border-gold/20 bg-gold/[.06]')}><div className="flex items-start justify-between"><span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accent ? 'bg-gold/15 text-gold' : 'bg-white/[.06] text-white/55')}><Icon className="h-5 w-5" /></span>{accent && <span className="text-[9px] font-semibold uppercase tracking-[.18em] text-gold/65">Live</span>}</div><p className="mt-5 font-display text-3xl font-semibold text-white">{value}</p><p className="mt-1 text-xs font-medium text-white/65">{label}</p>{detail && <p className="mt-2 text-[10px] text-white/30">{detail}</p>}</AdminCard>;
}

export function useAdminCollection<T extends Record<string, unknown>>(name: 'songs' | 'artists' | 'albums' | 'playlists' | 'users') {
  const [items, setItems] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    return subscribeCollection<T>(name, [], (next) => { setItems(next as (T & { id: string })[]); setLoading(false); }, (nextError) => { setError(nextError.message); setLoading(false); });
  }, [name]);
  return { items, setItems, loading, error };
}

export function FormField({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return <label className={cn('block', className)}><span className="mb-2 block text-xs font-medium text-white/60">{label}</span>{children}{hint && <span className="mt-1.5 block text-[10px] leading-4 text-white/30">{hint}</span>}</label>;
}

export const inputClass = 'h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-gold/50';
export const textareaClass = 'min-h-[110px] w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 transition focus:border-gold/50';

export function AdminTableEmpty({ text = 'Nothing here yet.' }: { text?: string }) { return <div className="px-5 py-14 text-center text-sm text-white/35">{text}</div>; }
export function TableArrow() { return <ChevronRight className="h-4 w-4 text-white/20" />; }
