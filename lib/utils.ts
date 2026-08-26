import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return '—:—';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

export function formatDate(value?: unknown) {
  if (!value) return '—';
  const date = typeof value === 'object' && value !== null && 'toDate' in value
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function slugToLabel(value: string) {
  return decodeURIComponent(value).replace(/-/g, ' ');
}

export function getInitials(value?: string) {
  return (value || 'SN')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function timestampToMillis(value?: unknown) {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
