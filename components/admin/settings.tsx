'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Cloud,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { AdminCard, AdminGuard, AdminHeading } from '@/components/admin/admin-shared';

type HealthState = 'checking' | 'ready' | 'warning';
type CloudinaryHealth = {
  state: HealthState;
  detail: string;
  authorized?: boolean;
};

export function SettingsPage() {
  return (
    <AdminGuard>
      <SettingsContent />
    </AdminGuard>
  );
}

function SettingsContent() {
  const { configured, user } = useAuth();
  const [cloudinary, setCloudinary] = useState<CloudinaryHealth>({
    state: 'checking',
    detail: 'Checking the server configuration…'
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const checkCloudinary = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/cloudinary/status', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });
        const payload = (await response.json()) as {
          configured?: boolean;
          mode?: 'signed' | 'unsigned' | 'none';
          cloudName?: string;
          message?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || 'Could not check the upload service.');
        }
        if (cancelled) return;

        setCloudinary(
          payload.configured
            ? {
                state: 'ready',
                detail: payload.cloudName
                  ? `${
                      payload.mode === 'unsigned' ? 'Server' : 'Server'
                    } uploads to ${payload.cloudName}`
                  : 'Uploads are ready',
                authorized: true
              }
            : {
                state: 'warning',
                detail:
                  payload.message ||
                  'Set the server-only CLOUDINARY_URL in Vercel and redeploy',
                authorized: true
              }
        );
      } catch (error) {
        if (!cancelled) {
          setCloudinary({
            state: 'warning',
            detail:
              error instanceof Error ? error.message : 'Could not check the upload service.',
            authorized: false
          });
        }
      }
    };

    void checkCloudinary();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-7">
      <AdminHeading
        title="Settings"
        description="Deployment checks and the guardrails behind your music studio."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Environment health
              </h2>
              <p className="mt-1 text-xs text-white/35">
                Live checks without exposing private values.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <HealthRow
              label="Firebase web configuration"
              state={configured ? 'ready' : 'warning'}
              detail={configured ? 'Client SDK ready' : 'Add NEXT_PUBLIC_FIREBASE_* variables'}
            />
            <HealthRow
              label="Cloudinary media uploads"
              state={cloudinary.state}
              detail={cloudinary.detail}
            />
            <HealthRow
              label="Admin upload authorization"
              state={
                cloudinary.authorized === undefined
                  ? 'checking'
                  : cloudinary.authorized
                    ? 'ready'
                    : 'warning'
              }
              detail={
                cloudinary.authorized === false
                  ? 'The server could not verify this admin account'
                  : 'Verified from users/{uid}.role'
              }
            />
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.06] text-white/60">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Media organization
              </h2>
              <p className="mt-1 text-xs text-white/35">
                Uploads use Cloudinary without creating folders.
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm leading-6 text-white/45">Files are stored without application-created Cloudinary folders. Images, videos, audio, PDFs and documents use the appropriate Cloudinary resource type.</p>
        </AdminCard>
      </div>

      <AdminCard className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.06] text-white/60">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Security notes</h2>
            <p className="mt-1 text-xs text-white/35">
              Keep these deployment boundaries intact.
            </p>
          </div>
        </div>
        <ul className="mt-6 grid gap-4 text-sm leading-6 text-white/50 md:grid-cols-3">
          <li>
            Uploads are proxied through the server using authenticated Cloudinary uploads. Only the server-only <code className="text-gold/80">CLOUDINARY_URL</code> is used; its credentials never reach the browser. No upload preset is required.
          </li>
          <li>
            Firestore rules protect favorites, playlists and listening history by Firebase
            UID.
          </li>
          <li>
            Media API routes verify both the Firebase ID token and the{' '}
            <code className="text-gold/80">users/{'{uid}'}.role</code> value before allowing
            changes.
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-5">
          <Link
            href="https://cloudinary.com/documentation/image_upload_api_reference"
            target="_blank"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gold hover:text-gold-bright"
          >
            Cloudinary upload API guide <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="https://firebase.google.com/docs/firestore/security/get-started"
            target="_blank"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gold hover:text-gold-bright"
          >
            Firestore rules guide <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </AdminCard>
      <p className="text-[11px] leading-5 text-white/25">
        A Firebase service account is not required for media uploads. It is only needed by
        server-side Firestore features such as play-count updates.
      </p>
    </div>
  );
}

function HealthRow({
  label,
  state,
  detail
}: {
  label: string;
  state: HealthState;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/[.07] px-3.5 py-3">
      <span
        className={
          state === 'ready'
            ? 'mt-0.5 text-emerald-300'
            : state === 'checking'
              ? 'mt-0.5 text-white/40'
              : 'mt-0.5 text-amber-300'
        }
      >
        {state === 'ready' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : state === 'checking' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/75">{label}</p>
        <p className="mt-1 break-words text-[10px] leading-4 text-white/35">{detail}</p>
      </div>
    </div>
  );
}
