# SIMZ NAXTY

Production-minded music streaming application built with Next.js, TypeScript, Tailwind CSS, Firebase Authentication, Firestore and signed Cloudinary uploads.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Add the Firebase web variables before enabling authentication. `CLOUDINARY_URL` must remain server-only; the browser receives only a short-lived upload signature from `/api/cloudinary/signature`.

## Firebase setup

1. Enable Email/Password Authentication.
2. Create a `users/{uid}` document after the first account is created. Set `role` to `admin` using a trusted admin workflow (never from the browser). This `role` field is the single source of truth for admin access.
3. Deploy `firestore.rules` and `firestore.indexes.json` with the Firebase CLI.

No service account is required for the upload flow: the API routes verify Firebase ID tokens using only the project ID, and admin authorization comes from the `users/{uid}.role` field enforced by `firestore.rules` and the client-side `AdminGuard`. A service account (`FIREBASE_SERVICE_ACCOUNT_JSON`) is only needed for server-side Firestore access, such as the play-count route.

## Media

Signed uploads organize audio and images under `simz-naxty/audio`, `simz-naxty/covers`, `simz-naxty/artists` and `simz-naxty/playlists`. Audio is sent to Cloudinary's `video` upload endpoint, which supports common audio formats and returns a secure URL.

No sample tracks or external media URLs are seeded. Until an admin publishes the first song, the public app intentionally shows a polished empty state: **No music yet. Check back soon.**
