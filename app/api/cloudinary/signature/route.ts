import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { getCloudinaryConfig } from '@/lib/cloudinary-server';
import { requireAdmin } from '@/lib/server-auth';

export const runtime = 'nodejs';

const folders = new Set([
  'simz-naxty/audio',
  'simz-naxty/covers',
  'simz-naxty/artists',
  'simz-naxty/playlists'
]);

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = (await request.json()) as { folder?: string };
    if (!body.folder || !folders.has(body.folder)) {
      return NextResponse.json(
        { error: 'Invalid upload folder', code: 'invalid_upload_folder' },
        { status: 400 }
      );
    }

    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder: body.folder, timestamp };
    const serializedParams = Object.entries(params)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    // The API secret stays server-side; the signature expires with its timestamp.
    const signature = createHash('sha1')
      .update(`${serializedParams}${apiSecret}`)
      .digest('hex');

    return NextResponse.json(
      { signature, timestamp, apiKey, cloudName, folder: body.folder },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return apiError(error);
  }
}
