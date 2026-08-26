# SIMZ NAXTY

Production-minded music streaming application built with Next.js, TypeScript, Tailwind CSS, Firebase Authentication, Firestore and Cloudinary media uploads.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Cloudinary media uploads

Cloud name: `dhad95cch` · unsigned upload preset: `Seedwell`

### Configuration

Cloudinary needs exactly one **server-only** variable. Set it locally and in the
deployment environment:

```dotenv
CLOUDINARY_URL=cloudinary://YOUR_API_KEY:YOUR_API_SECRET@dhad95cch
```

Do not set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
or any `NEXT_PUBLIC_CLOUDINARY_*` variable. The API key and secret never enter
the browser bundle.

### Upload mode

Uploads are **unsigned** and use the existing `Seedwell` preset. The browser
posts the file to `/api/cloudinary/upload`, which authenticates the admin and
then forwards only:

* `file`
* `upload_preset=Seedwell`

to `https://api.cloudinary.com/v1_1/dhad95cch/<resource_type>/upload`.

No signature is generated for uploads, so a signed and an unsigned
implementation are never mixed. `CLOUDINARY_URL` initializes the Cloudinary SDK
only for authenticated server operations — deleting assets and inspecting the
upload preset.

### Resource types

The resource type is derived from each file, so nothing is forced through the
image endpoint:

| File | Cloudinary resource type |
| --- | --- |
| Images | `image` |
| Videos | `video` |
| Audio | `video` (required by Cloudinary's media handling) |
| PDFs / documents | `raw` |

### No folders

No `folder` parameter is ever sent and no `public_id` is supplied, so Cloudinary
assigns a root-level id and no `seedwell/images/...` style structure is created.
The asset folder is not used as a public ID prefix.

### Replacing media

Cloudinary forces `overwrite=false` on unsigned uploads, and a preset with
*Disallow public ID* rejects a caller-supplied `public_id` outright, so a
replacement can never reuse the old id. Instead the client sends
`replaces_public_id`; the route uploads the new file first and only then deletes
the superseded asset with the signed Admin API. If the upload fails, the
existing asset is left untouched; if the cleanup fails, it is logged under
`[cloudinary_replace_cleanup]` and the upload still succeeds.

### Database records

After — and only after — Cloudinary confirms an upload, a record is written to
the `uploads` collection with `fileName`, `cloudinaryPublicId`, `secureUrl`,
`resourceType`, `format`, `bytes`, `uploadedAt` and `uploadedBy`. A rejected
upload never produces a record.

### Diagnosing upload errors

When Cloudinary rejects an upload the server logs the complete, credential-free
diagnostic under `[cloudinary_upload_failed]`: HTTP status, Cloudinary's error
message, error code, resource type, upload endpoint and upload preset. The API
secret, `CLOUDINARY_URL` and any authentication credential are never logged.

The application shows the actual Cloudinary problem instead of a generic
message. For example:

| Cloudinary says | The app shows |
| --- | --- |
| `Upload preset Seedwell not found` | Cloudinary upload failed: upload preset "Seedwell" was not found on cloud "dhad95cch". Create it in Settings → Upload → Upload presets. |
| `Upload preset must be whitelisted for unsigned uploads` | Cloudinary upload failed: upload preset "Seedwell" is not configured for unsigned uploads. Set its signing mode to Unsigned in Cloudinary. |
| `Invalid Signature` | Cloudinary upload failed: invalid signature. This upload must use the unsigned preset, not a server-generated signature. |
| `File size too large` | Cloudinary upload failed: file is too large (20.0 MB). The limit for image uploads is 10.0 MB. |
| `Invalid resource type` | Cloudinary upload failed: "image" is the wrong resource type for this file. |

In development the full safe diagnostic is also returned to the browser under a
`cloudinary` key and logged to the console. In production only the actionable
sentence is returned.

Oversized files are rejected in the browser before any byte is sent, using the
limits in `lib/cloudinary-shared.ts` (10 MB images/raw, 100 MB audio/video).

**Admin → Settings** reports whether `Seedwell` actually exists and is unsigned,
using the Admin API, so a preset misconfiguration is visible before an upload.

### Verifying the integration

```bash
# Offline: resource types, size limits, error mapping and the real route
# handler against a mock Cloudinary (55 checks).
node scripts/verify-cloudinary.mjs

# Live: real unsigned upload + download + delete of an image, audio file,
# video and PDF. Requires network access and real credentials.
CLOUDINARY_URL='cloudinary://KEY:SECRET@dhad95cch' node scripts/live-cloudinary-check.mjs
```

## Firebase setup

Enable Email/Password Authentication, create `users/{uid}` documents with the trusted `admin` role, and deploy the included Firestore rules and indexes.
