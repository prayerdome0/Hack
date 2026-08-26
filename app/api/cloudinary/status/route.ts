import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import {
  CloudinaryConfigurationError,
  getCloudinaryConfig
} from '@/lib/cloudinary-server';
import { requireAdmin } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    try {
      const { cloudName } = getCloudinaryConfig();
      return NextResponse.json(
        { configured: true, cloudName },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (error) {
      if (error instanceof CloudinaryConfigurationError) {
        return NextResponse.json(
          { configured: false, message: error.message },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }
      throw error;
    }
  } catch (error) {
    return apiError(error);
  }
}
