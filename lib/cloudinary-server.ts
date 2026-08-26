import { createHash } from 'crypto';
import { ApiError } from '@/lib/api-error';

/** Cloudinary is intentionally server-only. Never add these values to NEXT_PUBLIC_*. */
type CloudinaryEnvironment = { CLOUDINARY_URL?: string };

export class CloudinaryConfigurationError extends ApiError {
  constructor(message: string) {
    super(503, message, 'cloudinary_not_configured');
    this.name = 'CloudinaryConfigurationError';
  }
}

export interface CloudinaryServerConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function configuredUrl(environment?: CloudinaryEnvironment) {
  // Keep the actual SDK initialization and secret lookup on the server.
  return (environment?.CLOUDINARY_URL ?? process.env.CLOUDINARY_URL ?? '').trim();
}

/**
 * Parse and validate the one supported Cloudinary server variable.
 * CLOUDINARY_URL may be copied from Vercel with surrounding quotes or the
 * literal `CLOUDINARY_URL=` prefix, so accept those harmless forms too.
 */
export function getCloudinaryConfig(environment?: CloudinaryEnvironment): CloudinaryServerConfig {
  let value = configuredUrl(environment).replace(/^CLOUDINARY_URL\s*=\s*/, '').trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }

  if (!value) {
    throw new CloudinaryConfigurationError(
      'Cloudinary is not configured on the server. Set the server-only CLOUDINARY_URL environment variable and redeploy.'
    );
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'cloudinary:' || !parsed.hostname || !parsed.username || !parsed.password) {
      throw new Error('incomplete Cloudinary URL');
    }
    return {
      cloudName: decodeURIComponent(parsed.hostname),
      apiKey: decodeURIComponent(parsed.username),
      apiSecret: decodeURIComponent(parsed.password)
    };
  } catch {
    throw new CloudinaryConfigurationError(
      'CLOUDINARY_URL is invalid. Set it to cloudinary://YOUR_API_KEY:YOUR_API_SECRET@YOUR_CLOUD_NAME and redeploy.'
    );
  }
}

/**
 * The sole Cloudinary SDK entry point. The SDK reads the URL directly from
 * process.env; credentials are never returned to client components.
 */
export async function getCloudinary() {
  getCloudinaryConfig();
  const cloudinary = await import('cloudinary');
  // The runtime SDK accepts a CLOUDINARY_URL string; its TypeScript overloads
  // only describe object config, so keep the direct URL initialization typed
  // locally without copying credentials into another public-facing object.
  (cloudinary.v2.config as unknown as (url: string) => void)(process.env.CLOUDINARY_URL as string);
  return cloudinary.v2;
}

export function signCloudinaryParams(apiSecret: string, params: Record<string, string>) {
  const toSign = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join('&');
  return { signature: createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex'), toSign };
}

export type CloudinaryUploadStatus =
  | { configured: true; mode: 'signed'; cloudName: string }
  | { configured: false; mode: 'none'; cloudName?: undefined; message: string };

export function getUploadStatus(environment?: CloudinaryEnvironment): CloudinaryUploadStatus {
  try {
    const { cloudName } = getCloudinaryConfig(environment);
    return { configured: true, mode: 'signed', cloudName };
  } catch (error) {
    return {
      configured: false,
      mode: 'none',
      message: error instanceof CloudinaryConfigurationError
        ? error.message
        : 'Cloudinary is not configured on the server. Set the server-only CLOUDINARY_URL environment variable and redeploy.'
    };
  }
}
