/**
 * Default Cloudinary configuration for unsigned uploads.
 *
 * Uploads use an unsigned preset, so only the cloud name and preset are
 * needed — no API key or secret. These values are public by design (they are
 * shipped in `.env.example` and embedded in the client bundle), exactly like
 * the Firebase web defaults in `lib/firebase.ts`.
 *
 * The `NEXT_PUBLIC_CLOUDINARY_*` environment variables can override these
 * defaults when pointing the app at a different Cloudinary account.
 */
export const DEFAULT_CLOUDINARY_CONFIG = {
  cloudName: 'dhad95cch',
  uploadPreset: 'seedwell',
} as const;
