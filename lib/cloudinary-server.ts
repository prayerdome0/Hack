import { ApiError } from '@/lib/api-error';

type CloudinaryEnvironment = {
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string;
  // Legacy signed-upload variables (still used by the destroy endpoint)
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

const PLACEHOLDER_GUIDE =
  'Cloudinary console → Settings (gear) → API Keys shows the finished value. Copy the cloud name and set it as NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, then create an unsigned upload preset and set it as NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.';

/**
 * Checks whether the unsigned upload configuration is present.
 * Uploads only need NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and
 * NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET — no API key or secret required.
 */
export function getUnsignedUploadStatus(
  environment?: CloudinaryEnvironment
): { configured: boolean; cloudName?: string; message?: string } {
  const env = environment || (process.env as CloudinaryEnvironment);

  const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (cloudName && containsPlaceholder(cloudName)) {
    return {
      configured: false,
      message:
        'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME still contains placeholder text. ' +
        PLACEHOLDER_GUIDE
    };
  }

  if (uploadPreset && containsPlaceholder(uploadPreset)) {
    return {
      configured: false,
      message:
        'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET still contains placeholder text. ' +
        PLACEHOLDER_GUIDE
    };
  }

  if (!cloudName && !uploadPreset) {
    return {
      configured: false,
      message:
        'Media uploads are not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as environment variables, then redeploy.'
    };
  }

  if (!cloudName) {
    return {
      configured: false,
      message:
        'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is missing. Set it to your Cloudinary cloud name, then redeploy.'
    };
  }

  if (!uploadPreset) {
    return {
      configured: false,
      message:
        'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is missing. Create an unsigned upload preset in your Cloudinary dashboard and set it, then redeploy.'
    };
  }

  return { configured: true, cloudName };
}

/**
 * Reads full Cloudinary credentials for the destroy endpoint.
 * The destroy endpoint still needs API key + secret (signed operation).
 * Falls back to CLOUDINARY_URL or individual variables.
 */
export function getCloudinaryConfig(
  environment?: CloudinaryEnvironment
): CloudinaryServerConfig {
  const env = environment || (process.env as CloudinaryEnvironment);
  const rawUrl = cleanEnvironmentValue(env.CLOUDINARY_URL);

  if (rawUrl) {
    if (containsPlaceholder(rawUrl)) {
      throw new CloudinaryConfigurationError(
        'CLOUDINARY_URL still contains placeholder text. ' + PLACEHOLDER_GUIDE
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
          PLACEHOLDER_GUIDE
      );
    }
    return { cloudName, apiKey, apiSecret };
  }

  throw new CloudinaryConfigurationError(
    'The Cloudinary destroy endpoint needs full credentials. Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET) as server-only environment variables, then redeploy.'
  );
}
