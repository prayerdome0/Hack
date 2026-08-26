'use client';

import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/components/providers/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, signUp, configured, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && user) router.replace('/'); }, [loading, user, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password || (mode === 'signup' && !displayName.trim())) { toast.error('Complete the fields to continue.'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    setSubmitting(true);
    try { if (mode === 'signin') await signIn(email, password); else await signUp(email, password, displayName); router.replace('/'); } catch (error) { toast.error(error instanceof Error ? error.message.replace('Firebase: ', '') : 'Could not complete authentication.'); } finally { setSubmitting(false); }
  };

  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-8"><div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(215,181,109,.12),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(215,181,109,.08),transparent_25%)]" /><Link href="/" className="absolute left-5 top-5 flex items-center gap-2 text-xs text-white/40 hover:text-white"><ArrowLeft className="h-4 w-4" />Back home</Link><main className="relative w-full max-w-[430px]"><div className="mb-8 flex justify-center"><Logo /></div><div className="rounded-[28px] border border-white/10 bg-white/[.035] p-6 shadow-2xl sm:p-8"><div className="mb-7 text-center"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.25em] text-gold/80">Your listening space</p><h1 className="font-display text-3xl font-semibold text-white">{mode === 'signin' ? 'Welcome back.' : 'Join the sound.'}</h1><p className="mt-2 text-sm text-white/40">{mode === 'signin' ? 'Sign in to keep your favorites and playlists in sync.' : 'Create your free account and make the library yours.'}</p></div>{!configured && <div className="mb-5 rounded-2xl border border-gold/20 bg-gold/[.07] p-4 text-xs leading-5 text-gold/80"><ShieldCheck className="mb-2 h-4 w-4" />Firebase authentication is not configured in this environment yet. Add the NEXT_PUBLIC_FIREBASE variables from .env.example to enable sign-in.</div>}<form onSubmit={submit} className="space-y-4">{mode === 'signup' && <label className="block"><span className="mb-2 block text-xs font-medium text-white/55">Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold/50" placeholder="What should we call you?" /></label>}<label className="block"><span className="mb-2 block text-xs font-medium text-white/55">Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold/50" placeholder="you@example.com" /></label><label className="block"><span className="mb-2 block text-xs font-medium text-white/55">Password</span><div className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 pr-12 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold/50" placeholder="At least 6 characters" /><button type="button" onClick={() => setShowPassword((shown) => !shown)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-white/35 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label><button type="submit" disabled={submitting || !configured} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-semibold text-black transition hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-40">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{mode === 'signin' ? 'Sign in' : 'Create account'}</button></form><div className="mt-6 text-center text-xs text-white/40">{mode === 'signin' ? "Don't have an account?" : 'Already have an account?'} <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="font-semibold text-gold hover:text-gold-bright">{mode === 'signin' ? 'Create one' : 'Sign in'}</button></div></div><p className="mt-6 text-center text-[10px] leading-5 text-white/25">Your account powers private favorites, playlists and listening history. SIMZ NAXTY never sells your listening data.</p></main></div>;
}
