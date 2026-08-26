import { NextResponse } from 'next/server';
import { requireUser, apiError } from '@/lib/server-auth';

export const runtime = 'nodejs';

const folders = new Set(['simz-naxty/audio', 'simz-naxty/covers', 'simz-naxty/artists', 'simz-naxty/playlists']);

function cloudinaryConfig() {
  const raw = process.env.CLOUDINARY_URL;
  if (!raw) throw new Error('CLOUDINARY_URL is not configured on the server.');
  const parsed = new URL(raw);
  const cloudName = parsed.hostname;
  const apiKey = decodeURIComponent(parsed.username);
  const apiSecret = decodeURIComponent(parsed.password);
  if (!cloudName || !apiKey || !apiSecret) throw new Error('CLOUDINARY_URL is invalid.');
  return { cloudName, apiKey, apiSecret };
}

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const body = await request.json() as { folder?: string };
    if (!body.folder || !folders.has(body.folder)) return new Response('Invalid upload folder', { status: 400 });
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder: body.folder, timestamp };
    // Cloudinary signing happens server-side. The API secret never leaves this route.
    const crypto = await import('node:crypto');
    const signature = crypto.createHash('sha1').update(`${Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&')}${apiSecret}`).digest('hex');
    return NextResponse.json({ signature, timestamp, apiKey, cloudName, folder: body.folder });
  } catch (error) {
    return apiError(error);
  }
}
