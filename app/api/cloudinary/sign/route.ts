import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { getCloudinaryConfig, signCloudinaryParams } from '@/lib/cloudinary-server';
import { requireAdmin } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Issues a short-lived signed upload request for Cloudinary.
 *
 * The API secret never leaves the server. The browser receives only the
 * signature, timestamp and API key it needs to POST the file directly to
 * Cloudinary (the file itself is never proxied through this route).
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = (await request.json().catch(() => ({}))) as { folder?: string };
    const folder =
      typeof body.folder === 'string' && body.folder.trim() ? body.folder.trim() : undefined;

    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

    const timestamp = String(Math.round(Date.now() / 1000));
    const params: Record<string, string> = { timestamp };
    if (folder) params.folder = folder;

    const { signature } = signCloudinaryParams(apiSecret, params);

    return NextResponse.json(
      { cloudName, apiKey, timestamp, signature, folder },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return apiError(error);
  }
}
