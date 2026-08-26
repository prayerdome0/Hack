# SIMZ NAXTY

Production-minded music streaming application built with Next.js, TypeScript, Tailwind CSS, Firebase Authentication, Firestore and Cloudinary media uploads.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Cloudinary media uploads

Cloudinary is configured with one **server-only** variable. In local development and Vercel, set:

```dotenv
CLOUDINARY_URL=cloudinary://YOUR_API_KEY:YOUR_API_SECRET@dhad95cch
```

Do not set or require `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, or any `NEXT_PUBLIC_CLOUDINARY_*` variables. Uploads are proxied through the authenticated server route, which initializes the Cloudinary SDK from `process.env.CLOUDINARY_URL`. The API key, secret and URL never enter the browser bundle. The existing unsigned upload preset `Seedwell` is supplied to the SDK, without creating Cloudinary folders.

Images use Cloudinary's image resource type, video and audio use video, and PDFs/documents use raw. The same server configuration supports upload, replacement/overwrite, download URLs returned by Cloudinary, and deletion. If `CLOUDINARY_URL` is missing or malformed, API routes return a clear server-side configuration error and the Settings health check reports it.

For Vercel, add `CLOUDINARY_URL` under **Project Settings → Environment Variables** for the required environments, then redeploy. Existing deployments do not pick up new environment variables automatically.

## Firebase setup

Enable Email/Password Authentication, create `users/{uid}` documents with the trusted `admin` role, and deploy the included Firestore rules and indexes.
