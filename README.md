# SIMZ NAXTY

Production-minded music streaming application built with Next.js, TypeScript, Tailwind CSS, Firebase Authentication, Firestore and Cloudinary media uploads.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

The app includes the public Firebase web configuration for the `seedwel-cbeb8` project as defaults. Use the matching `NEXT_PUBLIC_FIREBASE_*` variables when connecting a different project.

## Firebase setup

1. Enable Email/Password Authentication.
2. Create a `users/{uid}` document after the first account is created. Set `role` to `admin` using a trusted admin workflow (never from the browser). This field is the single source of truth for admin access.
3. Deploy `firestore.rules` and `firestore.indexes.json` with the Firebase CLI.

The media API verifies the Firebase ID token and reads the caller's own `users/{uid}.role` through the Firestore REST API, where the deployed security rules still apply. It therefore does not need a Firebase service account. `FIREBASE_SERVICE_ACCOUNT_JSON` is only needed for server-side Firestore writes, such as the play-count route.

## Cloudinary media uploads

Media uploads use **unsigned uploads** by default: files are posted straight from the browser to Cloudinary using a cloud name and an unsigned upload preset — no API key or secret, and no server round-trip.

1. In the Cloudinary console, open **Settings → Upload** and add an upload preset with **Signing mode = Unsigned** (note the preset name).
2. Set the public variables in `.env.local` for local development:

   ```dotenv
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
   ```

3. For Vercel, add the same `NEXT_PUBLIC_` variables under **Project Settings → Environment Variables** for Production (and Preview when needed), then redeploy.
4. Sign in as an admin and open **Admin → Settings**. The live “Cloudinary media uploads” check shows which cloud the app is uploading to.

If the unsigned variables are absent, uploads fall back to a **signed** upload when `CLOUDINARY_URL` is set on the server (the API secret stays server-side). With neither configured, the upload form reports the exact setup problem instead of a generic “check your connection” error.

### Uploads still fail — checklist

- **The upload preset must be marked “Unsigned”.** Cloudinary console → **Settings → Upload** → the preset’s Signing mode must be **Unsigned**. A signed preset used without a signature returns an “upload preset” error.
- **`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` must be your real cloud name** (from the dashboard URL or **Settings → Account**), not `your_cloud_name`.
- The variables belong in the **hosting platform’s environment variables** (Vercel: Project → Settings → Environment Variables, Production), **not** in `.env.example` — that file is only a template and changing it configures nothing.
- After saving the variables you must **redeploy** (Vercel: Deployments → ⋯ → Redeploy). Existing deployments do not pick up new variables on their own.
- For local development, put the variables in `.env.local` and restart `npm run dev`.

Uploads organize media under `simz-naxty/audio`, `simz-naxty/covers`, `simz-naxty/artists` and `simz-naxty/playlists`. Cloudinary handles audio through its `video` upload endpoint and returns a secure delivery URL.

No sample tracks or external media URLs are seeded. Until an admin publishes the first song, the public app intentionally shows a polished empty state: **No music yet. Check back soon.**
