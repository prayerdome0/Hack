# SIMZ NAXTY

Production-minded music streaming application built with Next.js, TypeScript, Tailwind CSS, Firebase Authentication, Firestore and signed Cloudinary uploads.

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

Uploads require Cloudinary credentials on the **server**. The cloud name by itself is not enough to sign an upload.

1. In the Cloudinary console, open **Settings → API Keys** and copy the `CLOUDINARY_URL` value.
2. Add it to `.env.local` for local development:

   ```dotenv
   CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
   ```

   As an alternative, set all three of `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`.
3. For Vercel, add the same server-only variable under **Project Settings → Environment Variables** for Production (and Preview when needed), then redeploy. Do not name it `NEXT_PUBLIC_CLOUDINARY_URL`.
4. Sign in as an admin and open **Admin → Settings**. The live “Cloudinary signed uploads” check confirms whether the deployed server can read a complete configuration.

If configuration is absent or incomplete, the upload form now reports the exact setup problem instead of the generic “Unexpected server error.” API secrets never enter the client bundle; the browser receives only a short-lived signed upload request.

Signed uploads organize media under `simz-naxty/audio`, `simz-naxty/covers`, `simz-naxty/artists` and `simz-naxty/playlists`. Cloudinary handles audio through its `video` upload endpoint and returns a secure delivery URL.

No sample tracks or external media URLs are seeded. Until an admin publishes the first song, the public app intentionally shows a polished empty state: **No music yet. Check back soon.**
