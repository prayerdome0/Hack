import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { getUploadStatus } from '@/lib/cloudinary-server';
import { requireAdmin } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const status = getUploadStatus();
    return NextResponse.json(
      {
        configured: status.configured,
        mode: status.mode,
        cloudName: status.cloudName,
        message: status.configured ? undefined : status.message
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return apiError(error);
  }
}
