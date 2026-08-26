import { createHash } from 'crypto';
import { ApiError } from '@/lib/api-error';
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  describeCloudinaryFailure,
  readCloudinaryError,
  uploadEndpoint,
  type CloudinaryFailure,
  type CloudinaryResourceType
} from '@/lib/cloudinary-shared';

/** Cloudinary is intentionally server-only. Never add these values to NEXT_PUBLIC_*. */
type CloudinaryEnvironment = { CLOUDINARY_URL?: string };

export class CloudinaryConfigurationError extends ApiError {
  constructor(message: string) {
    super(503, message, 'cloudinary_not_configured');
    this.name = 'CloudinaryConfigurationError';
  }
}

/**
 * A Cloudinary rejection that already carries the real, actionable message.
 * `detail` is the safe diagnostic bundle: it is logged in every environment and
 * returned to the browser only in development.
 */
export class CloudinaryUploadError extends ApiError {
  constructor(message: string, public readonly detail: CloudinaryFailure) {
    super(detail.status && detail.status < 500 && detail.status !== 0 ? 400 : 502, message, 'cloudinary_upload_failed');
    this.name = 'CloudinaryUploadError';
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
 * CLOUDINARY_URL may be copied from a dashboard with surrounding quotes or the
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

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new CloudinaryConfigurationError(
      `CLOUDINARY_URL is invalid. Set it to cloudinary://YOUR_API_KEY:YOUR_API_SECRET@${CLOUDINARY_CLOUD_NAME} and redeploy.`
    );
  }

  if (parsed.protocol !== 'cloudinary:' || !parsed.hostname || !parsed.username || !parsed.password) {
    throw new CloudinaryConfigurationError(
      `CLOUDINARY_URL is incomplete. Set it to cloudinary://YOUR_API_KEY:YOUR_API_SECRET@${CLOUDINARY_CLOUD_NAME} and redeploy.`
    );
  }

  const cloudName = decodeURIComponent(parsed.hostname);
  if (cloudName !== CLOUDINARY_CLOUD_NAME) {
    // A mismatched cloud is the single most common cause of "upload preset not
    // found": the preset exists, just not on the cloud being called.
    throw new CloudinaryConfigurationError(
      `CLOUDINARY_URL points at cloud "${cloudName}" but this application uploads to "${CLOUDINARY_CLOUD_NAME}". Update the server environment variable and redeploy.`
    );
  }

  return {
    cloudName,
    apiKey: decodeURIComponent(parsed.username),
    apiSecret: decodeURIComponent(parsed.password)
  };
}

/**
 * The sole Cloudinary SDK entry point for authenticated (signed) operations
 * such as delete and asset lookups. The SDK is configured from CLOUDINARY_URL;
 * credentials are never returned to client components.
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

/**
 * Log the complete, credential-free Cloudinary diagnostic.
 *
 * Deliberately never logged: the API secret, CLOUDINARY_URL, the Authorization
 * header, or any signature. Only the preset name, endpoint, status and
 * Cloudinary's own message are recorded.
 */
export function logCloudinaryFailure(context: string, failure: CloudinaryFailure) {
  console.error(
    `[cloudinary_upload_failed] ${context}`,
    JSON.stringify({
      httpStatus: failure.status,
      cloudinaryMessage: failure.cloudinaryMessage,
      errorCode: failure.errorCode ?? null,
      resourceType: failure.resourceType,
      endpoint: failure.endpoint,
      uploadPreset: failure.uploadPreset,
      cloudName: CLOUDINARY_CLOUD_NAME,
      fileName: failure.fileName ?? null,
      fileSize: failure.fileSize ?? null,
      mimeType: failure.mimeType ?? null
    })
  );
}

export const isDevelopment = () => process.env.NODE_ENV !== 'production';

/**
 * Perform the unsigned upload against Cloudinary's REST API.
 *
 * The browser is proxied through this route so the request stays authenticated
 * by our own admin check, but the Cloudinary call itself is unsigned: it sends
 * only `file` + `upload_preset=Seedwell` to the resource-type-specific
 * endpoint. No signature is generated, so the two modes are never mixed.
 *
 * Note: an unsigned upload can never overwrite an existing asset — Cloudinary
 * forces `overwrite=false` — and many presets also disallow a caller-supplied
 * public_id. So no public_id is sent at all: Cloudinary assigns one, and
 * replacing an asset is done by uploading the new file and then deleting the
 * old one with the signed API (see `destroyAsset`).
 *
 * No `folder` is sent and no public_id is supplied, so Cloudinary creates no
 * folder structure.
 */
export async function unsignedUpload(options: {
  file: Blob;
  fileName: string;
  mimeType: string;
  resourceType: CloudinaryResourceType;
}): Promise<Record<string, unknown>> {
  // CLOUDINARY_API_BASE_URL is a server-only test seam (integration tests point
  // it at a mock). It is unset in every real environment.
  const endpoint = uploadEndpoint(CLOUDINARY_CLOUD_NAME, options.resourceType, process.env.CLOUDINARY_API_BASE_URL);

  const form = new FormData();
  form.append('file', options.file, options.fileName);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const baseFailure = {
    resourceType: options.resourceType,
    endpoint,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    fileName: options.fileName,
    fileSize: options.file.size,
    mimeType: options.mimeType
  };

  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', body: form });
  } catch (error) {
    const failure: CloudinaryFailure = {
      ...baseFailure,
      status: 0,
      cloudinaryMessage: error instanceof Error ? error.message : 'network request failed'
    };
    logCloudinaryFailure('network error before Cloudinary responded', failure);
    throw new CloudinaryUploadError(describeCloudinaryFailure(failure), failure);
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const { message, code } = readCloudinaryError(payload);
    const failure: CloudinaryFailure = {
      ...baseFailure,
      status: response.status,
      cloudinaryMessage: message || text.slice(0, 500),
      errorCode: code ?? response.status
    };
    logCloudinaryFailure('Cloudinary rejected the unsigned upload', failure);
    throw new CloudinaryUploadError(describeCloudinaryFailure(failure), failure);
  }

  const result = payload as Record<string, unknown>;
  if (!result || typeof result !== 'object' || typeof result.secure_url !== 'string') {
    const failure: CloudinaryFailure = {
      ...baseFailure,
      status: response.status,
      cloudinaryMessage: 'Cloudinary returned a success status without a secure_url.'
    };
    logCloudinaryFailure('malformed Cloudinary success response', failure);
    throw new CloudinaryUploadError(describeCloudinaryFailure(failure), failure);
  }
  return result;
}

export type CloudinaryUploadStatus =
  | {
      configured: true;
      mode: 'unsigned';
      cloudName: string;
      uploadPreset: string;
      presetState: 'unknown' | 'unsigned' | 'signed' | 'missing';
      presetDetail?: string;
    }
  | { configured: false; mode: 'none'; cloudName?: undefined; message: string };

export function getUploadStatus(environment?: CloudinaryEnvironment): CloudinaryUploadStatus {
  try {
    const { cloudName } = getCloudinaryConfig(environment);
    return {
      configured: true,
      mode: 'unsigned',
      cloudName,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      presetState: 'unknown'
    };
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

/**
 * Verify the `Seedwell` preset really exists and is unsigned, using the
 * authenticated Admin API. This is the check that turns the old opaque failure
 * into a precise instruction, and it runs server-side only.
 */
export async function inspectUploadPreset(): Promise<{
  state: 'unsigned' | 'signed' | 'missing' | 'unavailable';
  detail: string;
}> {
  try {
    const cloudinary = await getCloudinary();
    const preset = (await cloudinary.api.upload_preset(CLOUDINARY_UPLOAD_PRESET)) as {
      unsigned?: boolean;
      settings?: { folder?: string; asset_folder?: string };
    };
    if (preset.unsigned === false) {
      return {
        state: 'signed',
        detail: `Upload preset "${CLOUDINARY_UPLOAD_PRESET}" exists but its signing mode is Signed. Switch it to Unsigned in Cloudinary → Settings → Upload.`
      };
    }
    const folder = preset.settings?.folder;
    return {
      state: 'unsigned',
      detail: folder
        ? `Upload preset "${CLOUDINARY_UPLOAD_PRESET}" is unsigned but sets folder "${folder}". Clear the folder field so uploads stay at the root.`
        : `Upload preset "${CLOUDINARY_UPLOAD_PRESET}" is unsigned and creates no folders.`
    };
  } catch (error) {
    const status = (error as { error?: { http_code?: number }; http_code?: number })?.error?.http_code
      ?? (error as { http_code?: number })?.http_code;
    const message = (error as { error?: { message?: string }; message?: string })?.error?.message
      ?? (error as { message?: string })?.message
      ?? '';
    if (status === 404 || /not found/i.test(message)) {
      return {
        state: 'missing',
        detail: `Upload preset "${CLOUDINARY_UPLOAD_PRESET}" does not exist on cloud "${CLOUDINARY_CLOUD_NAME}". Create it as an unsigned preset.`
      };
    }
    console.error(
      '[cloudinary_preset_check_failed]',
      JSON.stringify({ httpStatus: status ?? null, cloudinaryMessage: message, uploadPreset: CLOUDINARY_UPLOAD_PRESET, cloudName: CLOUDINARY_CLOUD_NAME })
    );
    return {
      state: 'unavailable',
      detail: message
        ? `Could not verify the upload preset: ${message}`
        : 'Could not verify the upload preset with the Cloudinary Admin API.'
    };
  }
}
