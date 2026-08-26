'use client';

import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/providers/auth-provider';
import { LibraryProvider } from '@/components/providers/library-provider';
import { MusicProvider } from '@/components/providers/music-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LibraryProvider>
        <MusicProvider>
          {children}
          <Toaster position="top-right" theme="dark" toastOptions={{ className: 'sn-toast' }} />
        </MusicProvider>
      </LibraryProvider>
    </AuthProvider>
  );
}
