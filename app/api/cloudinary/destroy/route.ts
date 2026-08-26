import { NextResponse } from 'next/server';
import { apiError, ApiError } from '@/lib/api-error';
import { getCloudinary, isDevelopment } from '@/lib/cloudinary-server';
import { CLOUDINARY_CLOUD_NAME, type CloudinaryResourceType } from '@/lib/cloudinary-shared';
import { requireAdmin } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESOURCE_TYPES: CloudinaryResourceType[] = ['image', 'video', 'raw'];

/**
 * Deleting an asset is an authenticated (signed) Admin operation, so it uses
 * the SDK initialized from CLOUDINARY_URL. Unsigned presets cannot delete.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = (await request.json()) as { publicId?: string; resourceType?: CloudinaryResourceType };
    if (!body.publicId) throw new ApiError(400, 'Public id is required', 'missing_public_id');

    const cloudinary = await getCloudinary();
    // Cloudinary scopes a public id by resource type. Try the caller's type
    // first, then the others, so a mis-tagged record still deletes instead of
    // silently returning "not found".
    const ordered = [
      ...(body.resourceType && RESOURCE_TYPES.includes(body.resourceType) ? [body.resourceType] : []),
      ...RESOURCE_TYPES.filter((type) => type !== body.resourceType)
    ];

    let lastResult: { result?: string } = {};
    for (const resourceType of ordered) {
      const result = (await cloudinary.uploader.destroy(body.publicId, {
        resource_type: resourceType,
        invalidate: true
      })) as { result?: string };
      lastResult = result;
      if (result.result === 'ok') {
        return NextResponse.json(
          { result: 'ok', publicId: body.publicId, resourceType },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    console.error(
      '[cloudinary_destroy_failed]',
      JSON.stringify({
        publicId: body.publicId,
        triedResourceTypes: ordered,
        cloudinaryResult: lastResult.result ?? null,
        cloudName: CLOUDINARY_CLOUD_NAME
      })
    );
    return NextResponse.json(
      {
        result: lastResult.result ?? 'not found',
        error: `Cloudinary could not delete "${body.publicId}": ${lastResult.result ?? 'not found'}.`,
        code: 'cloudinary_destroy_failed'
      },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (error instanceof ApiError) return apiError(error);
    const message = (error as { error?: { message?: string }; message?: string })?.error?.message
      ?? (error as { message?: string })?.message
      ?? '';
    console.error('[cloudinary_destroy_failed]', JSON.stringify({ cloudinaryMessage: message, cloudName: CLOUDINARY_CLOUD_NAME }));
    return apiError(
      new ApiError(
        502,
        isDevelopment() && message ? `Cloudinary delete failed: ${message}` : 'Cloudinary delete failed.',
        'cloudinary_destroy_failed'
      )
    );
  }
}
