import { ApiError } from '@/lib/api-error';

export interface CloudinaryServerConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

type CloudinaryEnvironment = {
  CLOUDINARY_URL?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
};

export class CloudinaryConfigurationError extends ApiError {
  constructor(message: string) {
    super(503, message, 'cloudinary_not_configured');
    this.name = 'CloudinaryConfigurationError';
  }
}

function cleanEnvironmentValue(value: string | undefined) {
  if (!value) return '';
  let cleaned = value.trim();

  // Be forgiving when a complete `CLOUDINARY_URL=...` line or a quoted value
  // was pasted into a hosting provider's value field.
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

function separateConfiguration(env: CloudinaryEnvironment): CloudinaryServerConfig | undefined {
  const cloudName = cleanEnvironmentValue(
    env.CLOUDINARY_CLOUD_NAME || env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  );
  const apiKey = cleanEnvironmentValue(env.CLOUDINARY_API_KEY);
  const apiSecret = cleanEnvironmentValue(env.CLOUDINARY_API_SECRET);

  if (!cloudName && !apiKey && !apiSecret) return undefined;
  if (
    !cloudName ||
    !apiKey ||
    !apiSecret ||
    [cloudName, apiKey, apiSecret].some(containsPlaceholder)
  ) {
    throw new CloudinaryConfigurationError(
      'Cloudinary configuration is incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on the server, then redeploy.'
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function urlConfiguration(rawValue: string): CloudinaryServerConfig {
  try {
    const parsed = new URL(rawValue);
    if (parsed.protocol !== 'cloudinary:') throw new Error('Unexpected protocol');

    const cloudName = decodeURIComponent(parsed.hostname);
    const apiKey = decodeURIComponent(parsed.username);
    const apiSecret = decodeURIComponent(parsed.password);
    if (
      !cloudName ||
      !apiKey ||
      !apiSecret ||
      [cloudName, apiKey, apiSecret].some(containsPlaceholder)
    ) {
      throw new Error('Missing Cloudinary URL component');
    }

    return { cloudName, apiKey, apiSecret };
  } catch {
    throw new CloudinaryConfigurationError(
      'CLOUDINARY_URL is invalid. Use cloudinary://API_KEY:API_SECRET@CLOUD_NAME in the server environment, then redeploy.'
    );
  }
}

/**
 * Reads Cloudinary credentials without exposing them to a client bundle.
 * CLOUDINARY_URL is preferred, while separate variables are supported for
 * hosting integrations that inject credentials individually.
 */
export function getCloudinaryConfig(
  environment?: CloudinaryEnvironment
): CloudinaryServerConfig {
  const env = environment || (process.env as CloudinaryEnvironment);
  const rawUrl = cleanEnvironmentValue(env.CLOUDINARY_URL);
  if (rawUrl) {
    try {
      return urlConfiguration(rawUrl);
    } catch (error) {
      // A complete set of individual variables can recover from a stale or
      // accidentally malformed CLOUDINARY_URL.
      const separate = separateConfiguration(env);
      if (separate) return separate;
      throw error;
    }
  }

  const separate = separateConfiguration(env);
  if (separate) return separate;

  throw new CloudinaryConfigurationError(
    'Media uploads are not configured on this deployment. Add CLOUDINARY_URL to the server environment, then redeploy.'
  );
}
