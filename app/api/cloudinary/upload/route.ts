import { NextResponse } from 'next/server';
import { apiError, ApiError } from '@/lib/api-error';
import { getCloudinary } from '@/lib/cloudinary-server';
import { requireAdmin } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Server-proxied upload: the browser never receives CLOUDINARY_URL or credentials. */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new ApiError(400, 'A file is required', 'missing_file');
    const cloudinary = await getCloudinary();
    const buffer = Buffer.from(await file.arrayBuffer());
    const resourceType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') || file.type.startsWith('audio/') ? 'video' : 'raw';
    const publicId = form.get('public_id');
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          // CLOUDINARY_URL configures an authenticated (signed) upload. Do not
          // also force an unsigned preset here: unsigned presets can reject
          // signed-only parameters such as public_id and overwrite.
          resource_type: resourceType,
          overwrite: true,
          ...(typeof publicId === 'string' && publicId ? { public_id: publicId } : {})
        },
        (error, uploaded) => error ? reject(error) : resolve(uploaded as Record<string, unknown>)
      );
      stream.end(buffer);
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Preserve our own auth/configuration errors and translate only provider
    // errors. The response deliberately excludes the SDK error object and
    // request details.
    if (error instanceof ApiError) return apiError(error);
    if (error instanceof Error && error.message) {
      return apiError(new ApiError(502, error.message, 'cloudinary_upload_failed'));
    }
    return apiError(error);
  }
}
