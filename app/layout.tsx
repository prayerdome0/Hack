import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/chrome/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIMZ NAXTY — Music for the moment',
  description: 'A premium home for the SIMZ NAXTY sound.',
  icons: { icon: '/logo.svg' }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers><AppShell>{children}</AppShell></Providers></body></html>;
}
