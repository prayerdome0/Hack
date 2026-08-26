import { createHash } from 'crypto';
import { ApiError } from '@/lib/api-error';

type CloudinaryEnvironment = {
  // Unsigned-upload variables (public by design, embedded in the client bundle)
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string;
  // Signed-upload variables (server-only)
  CLOUDINARY_URL?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
};

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

function cleanEnvironmentValue(value: string | undefined) {
  if (!value) return '';
  let cleaned = value.trim();

  const stripWrappingQuotes = () => {
    if (
      cleaned.length >= 2 &&
      ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'")))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }
  };

  stripWrappingQuotes();
  if (/^CLOUDINARY_URL\s*=/.test(cleaned)) {
    cleaned = cleaned.replace(/^CLOUDINARY_URL\s*=\s*/, '').trim();
  }
  stripWrappingQuotes();

  return cleaned;
}

function containsPlaceholder(value: string) {
  return /[<>]|your[_ -]?(api|cloud|secret)/i.test(value);
}

const SIGNED_PLACEHOLDER_GUIDE =
  'Cloudinary console → Settings (gear) → API Keys shows the finished value. Copy the CLOUDINARY_URL value as-is into your server environment variables.';

const UNSIGNED_PLACEHOLDER_GUIDE =
  'Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME to your Cloudinary cloud name and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to an unsigned upload preset (Cloudinary console → Settings → Upload).';

/**
 * Computes a Cloudinary upload signature.
 *
 * The signature covers every parameter that will be sent with the upload
 * (except `file`, `api_key` and `signature`), sorted alphabetically and
 * joined with `&`, followed by the API secret. This matches Cloudinary's
 * server-side signature algorithm.
 */
export function signCloudinaryParams(
  apiSecret: string,
  params: Record<string, string>
): { signature: string; toSign: string } {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  const signature = createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
  return { signature, toSign };
}

/**
 * Reads full Cloudinary credentials for signed server-side operations
 * (upload signing and destroy). Falls back to CLOUDINARY_URL or individual
 * variables.
 */
export function getCloudinaryConfig(
  environment?: CloudinaryEnvironment
): CloudinaryServerConfig {
  const env = environment || (process.env as CloudinaryEnvironment);
  const rawUrl = cleanEnvironmentValue(env.CLOUDINARY_URL);

  if (rawUrl) {
    if (containsPlaceholder(rawUrl)) {
      throw new CloudinaryConfigurationError(
        'CLOUDINARY_URL still contains placeholder text. ' + SIGNED_PLACEHOLDER_GUIDE
      );
    }
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'cloudinary:') throw new Error('Unexpected protocol');

      const cloudName = decodeURIComponent(parsed.hostname);
      const apiKey = decodeURIComponent(parsed.username);
      const apiSecret = decodeURIComponent(parsed.password);
      if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Missing Cloudinary URL component');
      }

      return { cloudName, apiKey, apiSecret };
    } catch (error) {
      if (error instanceof CloudinaryConfigurationError) throw error;
      // Try individual variables as fallback
    }
  }

  // Try individual server-only variables
  const cloudName = cleanEnvironmentValue(env.CLOUDINARY_CLOUD_NAME);
  const apiKey = cleanEnvironmentValue(env.CLOUDINARY_API_KEY);
  const apiSecret = cleanEnvironmentValue(env.CLOUDINARY_API_SECRET);

  if (cloudName && apiKey && apiSecret) {
    if ([cloudName, apiKey, apiSecret].some(containsPlaceholder)) {
      throw new CloudinaryConfigurationError(
        'Cloudinary environment variables still contain placeholder text. ' +
          SIGNED_PLACEHOLDER_GUIDE
      );
    }
    return { cloudName, apiKey, apiSecret };
  }

  throw new CloudinaryConfigurationError(
    'Cloudinary is not configured on the server. Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET) as server-only environment variables, then redeploy.'
  );
}

export type CloudinaryUploadStatus =
  | {
      configured: true;
      mode: 'signed' | 'unsigned';
      cloudName: string;
      message?: string;
    }
  | {
      configured: false;
      mode: 'none';
      cloudName?: undefined;
      message: string;
    };

/**
 * Reports how media uploads are configured for this deployment.
 *
 * Unsigned uploads (NEXT_PUBLIC_CLOUDINARY_* variables) are the primary mode
 * because they post directly from the browser without a server round-trip.
 * Signed uploads (server-side CLOUDINARY_URL) are a supported fallback.
 */
export function getUploadStatus(environment?: CloudinaryEnvironment): CloudinaryUploadStatus {
  const env = environment || (process.env as CloudinaryEnvironment);

  // 1) Unsigned uploads — primary mode
  const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (cloudName && containsPlaceholder(cloudName)) {
    return {
      configured: false,
      mode: 'none',
      message:
        'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME still contains placeholder text. ' +
        UNSIGNED_PLACEHOLDER_GUIDE
    };
  }

  if (uploadPreset && containsPlaceholder(uploadPreset)) {
    return {
      configured: false,
      mode: 'none',
      message:
        'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET still contains placeholder text. ' +
        UNSIGNED_PLACEHOLDER_GUIDE
    };
  }

  if (cloudName && uploadPreset) {
    return { configured: true, mode: 'unsigned', cloudName };
  }

  // 2) Signed uploads — fallback when no unsigned preset is configured
  try {
    const config = getCloudinaryConfig(env);
    return { configured: true, mode: 'signed', cloudName: config.cloudName };
  } catch (error) {
    // Keep going; nothing usable may still be reported below.
    if (error instanceof CloudinaryConfigurationError) {
      // Placeholder text in CLOUDINARY_URL is worth surfacing verbatim.
      if (containsPlaceholder(cleanEnvironmentValue(env.CLOUDINARY_URL))) {
        return { configured: false, mode: 'none', message: error.message };
      }
    }
  }

  // 3) Nothing usable configured
  return {
    configured: false,
    mode: 'none',
    message:
      'Media uploads are not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET for unsigned uploads (or CLOUDINARY_URL on the server), then redeploy.'
  };
}
