import { NextResponse } from 'next/server';
import { apiError, ApiError } from '@/lib/api-error';
import {
  CloudinaryUploadError,
  isDevelopment,
  unsignedUpload
} from '@/lib/cloudinary-server';
import {
  CLOUDINARY_UPLOAD_PRESET,
  checkFileSize,
  isAudioFile,
  resourceTypeFor,
  type CloudinaryResourceType
} from '@/lib/cloudinary-shared';
import { requireAdmin } from '@/lib/server-auth';

/**
 * Delete the asset a new upload has superseded. Deletion is a signed Admin
 * operation, so it uses CLOUDINARY_URL. A cleanup failure must never fail the
 * upload that already succeeded, so it is logged and swallowed.
 */
async function destroySupersededAsset(publicId: string, resourceType: CloudinaryResourceType) {
  try {
    const { getCloudinary } = await import('@/lib/cloudinary-server');
    const cloudinary = await getCloudinary();
    const outcome = (await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    })) as { result?: string };
    if (outcome.result !== 'ok') {
      console.warn(
        '[cloudinary_replace_cleanup]',
        JSON.stringify({ publicId, resourceType, cloudinaryResult: outcome.result ?? null })
      );
      return null;
    }
    return publicId;
  } catch (error) {
    console.warn(
      '[cloudinary_replace_cleanup_failed]',
      JSON.stringify({
        publicId,
        resourceType,
        cloudinaryMessage: (error as { message?: string })?.message ?? 'unknown error'
      })
    );
    return null;
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server-proxied *unsigned* upload.
 *
 * The browser never receives CLOUDINARY_URL, the API key or the API secret: it
 * posts the file to this authenticated route, which forwards only
 * `file` + `upload_preset=Seedwell` to the correct Cloudinary resource-type
 * endpoint for cloud `dhad95cch`. No signature is generated, so a signed and
 * unsigned implementation are never mixed. No folder is sent.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new ApiError(400, 'A file is required', 'missing_file');

    const fileName = file.name || 'upload';
    // Cloudinary rejects a file sent to the wrong endpoint ("Invalid image
    // file"), so the resource type always comes from the file itself.
    const resourceType: CloudinaryResourceType = resourceTypeFor({ name: fileName, type: file.type });

    // Enforce our own limit before sending bytes, so an oversized file gets a
    // precise message instead of Cloudinary's "File size too large".
    const size = checkFileSize({ name: fileName, size: file.size }, resourceType);
    if (!size.ok) throw new ApiError(413, size.message, 'file_too_large');

    const result = await unsignedUpload({
      file,
      fileName,
      mimeType: file.type,
      resourceType
    });

    // Replacing media: an unsigned upload cannot overwrite an existing asset
    // (Cloudinary forces overwrite=false), so the new file gets a fresh public
    // id and the superseded asset is deleted afterwards with the signed API.
    // This runs only after Cloudinary confirmed the new upload, so a failed
    // upload never destroys the existing asset.
    const replaces = form.get('replaces_public_id');
    let replacedPublicId: string | null = null;
    if (typeof replaces === 'string' && replaces.trim() && replaces.trim() !== result.public_id) {
      replacedPublicId = await destroySupersededAsset(replaces.trim(), resourceType);
    }

    return NextResponse.json(
      {
        secure_url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type ?? resourceType,
        format: result.format ?? null,
        bytes: result.bytes ?? file.size,
        duration: result.duration ?? null,
        width: result.width ?? null,
        height: result.height ?? null,
        original_filename: result.original_filename ?? fileName,
        created_at: result.created_at ?? new Date().toISOString(),
        is_audio: isAudioFile({ name: fileName, type: file.type }),
        replaced_public_id: replacedPublicId
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    // Return Cloudinary's real message. In development the full safe diagnostic
    // (status, code, resource type, endpoint, preset) is attached too; in
    // production only the actionable sentence is sent, and the diagnostic has
    // already been logged server-side. Credentials are never included.
    if (error instanceof CloudinaryUploadError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          ...(isDevelopment()
            ? {
                cloudinary: {
                  httpStatus: error.detail.status,
                  cloudinaryMessage: error.detail.cloudinaryMessage,
                  errorCode: error.detail.errorCode ?? null,
                  resourceType: error.detail.resourceType,
                  endpoint: error.detail.endpoint,
                  uploadPreset: error.detail.uploadPreset
                }
              }
            : {})
        },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    if (error instanceof ApiError) return apiError(error);
    console.error('Unexpected Cloudinary upload error:', error);
    return apiError(error);
  }
}
