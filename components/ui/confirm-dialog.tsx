'use client';

import { AlertTriangle, X } from 'lucide-react';

export function ConfirmDialog({ open, title, description, confirmLabel = 'Delete', onConfirm, onClose, destructive = true }: { open: boolean; title: string; description: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void; destructive?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-300"><AlertTriangle className="h-5 w-5" /></div>
            <div><h2 id="confirm-title" className="font-display text-lg font-semibold text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-white/50">{description}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close confirmation" className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5">Cancel</button><button type="button" onClick={onConfirm} className={destructive ? 'rounded-xl bg-red-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-red-300' : 'rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright'}>{confirmLabel}</button></div>
      </div>
    </div>
  );
}
