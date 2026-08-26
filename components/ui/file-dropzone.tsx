'use client';

import { Check, FileAudio, ImagePlus, UploadCloud, X } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

export function FileDropzone({ accept, label, hint, file, onChange, type = 'audio', progress }: { accept: string; label: string; hint: string; file: File | null; onChange: (file: File | null) => void; type?: 'audio' | 'image'; progress?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = type === 'audio' ? FileAudio : ImagePlus;
  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={(event) => onChange(event.target.files?.[0] || null)} />
      {file ? (
        <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/[.06] p-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><Check className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{file.name}</p><p className="mt-0.5 text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB{progress !== undefined && progress < 100 ? ` · ${progress}% uploaded` : ''}</p>{progress !== undefined && progress < 100 && <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div>}</div>
          <button type="button" onClick={() => onChange(null)} className="rounded-lg p-2 text-white/35 hover:bg-white/10 hover:text-white" aria-label={`Remove ${type} file`}><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className={cn('group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[.02] px-5 py-8 text-center transition hover:border-gold/50 hover:bg-gold/[.04]')}>
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/[.06] text-white/55 transition group-hover:bg-gold/15 group-hover:text-gold"><Icon className="h-5 w-5" /></span>
          <span className="text-sm font-medium text-white/80">{label}</span><span className="mt-1 text-xs text-white/35">{hint}</span><UploadCloud className="mt-4 h-4 w-4 text-gold/60" />
        </button>
      )}
    </div>
  );
}
