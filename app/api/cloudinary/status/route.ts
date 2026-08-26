import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { getUploadStatus, inspectUploadPreset } from '@/lib/cloudinary-server';
import { CLOUDINARY_UPLOAD_PRESET } from '@/lib/cloudinary-shared';
import { requireAdmin } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reports whether Cloudinary is usable *and* whether the `Seedwell` preset is
 * actually configured for unsigned uploads — the exact condition behind the
 * old opaque upload rejection. Only non-secret values are returned.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const status = getUploadStatus();
    if (!status.configured) {
      return NextResponse.json(
        { configured: false, mode: status.mode, message: status.message, uploadPreset: CLOUDINARY_UPLOAD_PRESET },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const preset = await inspectUploadPreset();
    const healthy = preset.state === 'unsigned' || preset.state === 'unavailable';

    return NextResponse.json(
      {
        configured: healthy,
        mode: status.mode,
        cloudName: status.cloudName,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        presetState: preset.state,
        message: healthy ? preset.detail : preset.detail
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return apiError(error);
  }
}
