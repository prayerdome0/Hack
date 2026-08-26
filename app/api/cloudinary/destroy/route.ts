import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { getCloudinaryConfig } from '@/lib/cloudinary-server';
import { requireAdmin } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = (await request.json()) as {
      publicId?: string;
      resourceType?: 'image' | 'video' | 'raw';
    };
    if (!body.publicId) {
      return NextResponse.json(
        { error: 'Public id is required', code: 'missing_public_id' },
        { status: 400 }
      );
    }

    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const cloudinary = await import('cloudinary');
    cloudinary.v2.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    const result = await cloudinary.v2.uploader.destroy(body.publicId, {
      resource_type: body.resourceType || 'image',
      invalidate: true
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error);
  }
}
