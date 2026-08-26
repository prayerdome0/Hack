'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="flex min-h-[55vh] flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/10 text-red-200"><AlertCircle className="h-6 w-6" /></div><h1 className="mt-5 font-display text-2xl font-semibold text-white">Something interrupted the signal.</h1><p className="mt-2 max-w-md text-sm leading-6 text-white/45">Try refreshing this view. Your music and private library data are safe.</p><button type="button" onClick={() => reset()} className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-semibold text-black hover:bg-gold-bright"><RotateCcw className="h-3.5 w-3.5" />Try again</button></div>;
}
