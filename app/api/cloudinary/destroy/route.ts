import { NextResponse } from 'next/server';
import { requireUser, apiError } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const body = await request.json() as { publicId?: string; resourceType?: 'image' | 'video' };
    if (!body.publicId || !body.publicId.startsWith('simz-naxty/')) return new Response('Invalid public id', { status: 400 });
    const cloudinary = await import('cloudinary');
    cloudinary.v2.config({ cloudinary_url: process.env.CLOUDINARY_URL, secure: true });
    const result = await cloudinary.v2.uploader.destroy(body.publicId, { resource_type: body.resourceType || 'image', invalidate: true });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
