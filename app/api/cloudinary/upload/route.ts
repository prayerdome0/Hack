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

    const requestedPublicId = form.get('public_id');
    // Strip any folder prefix: this application never creates Cloudinary folders.
    const publicId = typeof requestedPublicId === 'string' && requestedPublicId.trim()
      ? requestedPublicId.trim().split('/').pop() || undefined
      : undefined;

    const result = await unsignedUpload({
      file,
      fileName,
      mimeType: file.type,
      resourceType,
      publicId
    });

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
        is_audio: isAudioFile({ name: fileName, type: file.type })
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
