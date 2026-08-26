/**
 * Isomorphic Cloudinary helpers shared by the browser uploader and the server
 * routes. Nothing in this file may reference an API key, an API secret or
 * CLOUDINARY_URL: it is bundled into the client.
 *
 * Only two Cloudinary values are public by design and safe here:
 *   - the cloud name (it appears in every delivery URL)
 *   - the unsigned upload preset name
 */

/** The cloud that owns every asset for this project. */
export const CLOUDINARY_CLOUD_NAME = 'dhad95cch';

/** The existing unsigned upload preset. Unsigned uploads must send this. */
export const CLOUDINARY_UPLOAD_PRESET = 'Seedwell';

export const CLOUDINARY_API_BASE = 'https://api.cloudinary.com/v1_1';

/**
 * Cloudinary stores every asset under one of three resource types and each has
 * its own upload endpoint. Sending a video to the image endpoint fails with
 * "Invalid image file", so the type is always derived from the file itself.
 */
export type CloudinaryResourceType = 'image' | 'video' | 'raw';

/**
 * Upload ceilings enforced *before* a byte leaves the browser so the user gets
 * a precise message instead of a Cloudinary "File size too large" rejection.
 * These match Cloudinary's default per-resource-type limits.
 */
export const CLOUDINARY_SIZE_LIMITS: Record<CloudinaryResourceType, number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  raw: 10 * 1024 * 1024
};

const RAW_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv',
  'json', 'xml', 'zip', 'rar', '7z', 'gz', 'srt', 'vtt', 'lrc'
]);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'ico', 'svg', 'heic', 'heif', 'tiff']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', 'ogv', '3gp']);
// Cloudinary has no "audio" resource type: audio is handled by `video`.
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'flac', 'wma', 'aiff', 'weba']);

export function fileExtension(fileName: string) {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName.trim());
  return match ? match[1].toLowerCase() : '';
}

/**
 * Choose the Cloudinary resource type for a file.
 *
 * images  -> image
 * video   -> video
 * audio   -> video  (required by Cloudinary's media handling)
 * pdf/doc -> raw
 */
export function resourceTypeFor(input: { name?: string; type?: string }): CloudinaryResourceType {
  const mime = (input.type || '').toLowerCase();
  const extension = fileExtension(input.name || '');

  // A PDF is `raw` for this app: it is stored and downloaded, never transformed.
  if (mime === 'application/pdf' || extension === 'pdf') return 'raw';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'video';
  if (mime.startsWith('text/') || mime.startsWith('application/')) return 'raw';

  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (AUDIO_EXTENSIONS.has(extension)) return 'video';
  if (RAW_EXTENSIONS.has(extension)) return 'raw';

  // Unknown binaries are stored verbatim rather than pushed through the image
  // pipeline, which would reject them.
  return 'raw';
}

/** True when the file is audio delivered through the `video` resource type. */
export function isAudioFile(input: { name?: string; type?: string }) {
  const mime = (input.type || '').toLowerCase();
  if (mime.startsWith('audio/')) return true;
  if (mime.startsWith('video/') || mime.startsWith('image/')) return false;
  return AUDIO_EXTENSIONS.has(fileExtension(input.name || ''));
}

export function uploadEndpoint(cloudName: string, resourceType: CloudinaryResourceType, apiBase?: string) {
  const base = (apiBase || CLOUDINARY_API_BASE).replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(cloudName)}/${resourceType}/upload`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes >= 100 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}

export type SizeCheck = { ok: true } | { ok: false; message: string };

/** Enforce the application's own upload limit before contacting Cloudinary. */
export function checkFileSize(file: { name?: string; size: number }, resourceType: CloudinaryResourceType): SizeCheck {
  const limit = CLOUDINARY_SIZE_LIMITS[resourceType];
  if (file.size <= limit) return { ok: true };
  return {
    ok: false,
    message: `${file.name || 'This file'} is ${formatBytes(file.size)}. The maximum ${resourceType === 'video' ? 'audio/video' : resourceType} upload size is ${formatBytes(limit)}.`
  };
}

/**
 * The structured, credential-free description of a Cloudinary failure. It is
 * logged on the server and (in development) returned to the browser.
 */
export interface CloudinaryFailure {
  /** HTTP status returned by Cloudinary, or 0 when the request never landed. */
  status: number;
  /** The verbatim `error.message` from Cloudinary. */
  cloudinaryMessage: string;
  /** Cloudinary's machine-readable code when present. */
  errorCode?: string | number;
  resourceType: CloudinaryResourceType;
  /** Upload endpoint used for the request (never contains credentials). */
  endpoint: string;
  /** Upload preset used, or 'none (signed server upload)'. */
  uploadPreset: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

/**
 * Translate a real Cloudinary rejection into an actionable message.
 *
 * This intentionally never falls back to the old catch-all
 * "Cloudinary rejected this upload. Try again or check the Cloudinary account
 * configuration." — the caller always sees what Cloudinary actually said.
 */
export function describeCloudinaryFailure(failure: CloudinaryFailure): string {
  const raw = (failure.cloudinaryMessage || '').trim();
  const normalized = raw.toLowerCase();
  const preset = failure.uploadPreset;

  if (!raw) {
    return failure.status
      ? `Cloudinary upload failed: the ${failure.resourceType} endpoint returned HTTP ${failure.status} with no error message.`
      : 'Cloudinary upload failed: the request never reached Cloudinary. Check your network connection.';
  }

  if (normalized.includes('upload preset') && (normalized.includes('not found') || normalized.includes('unknown'))) {
    return `Cloudinary upload failed: upload preset "${preset}" was not found on cloud "${CLOUDINARY_CLOUD_NAME}". Create it in Settings → Upload → Upload presets.`;
  }
  if (normalized.includes('unsigned') && normalized.includes('preset')) {
    return `Cloudinary upload failed: upload preset "${preset}" is not configured for unsigned uploads. Set its signing mode to Unsigned in Cloudinary.`;
  }
  if (normalized.includes('unsigned') || normalized.includes('whitelisted for unsigned')) {
    return `Cloudinary upload failed: ${raw} (preset "${preset}" must allow this parameter for unsigned uploads).`;
  }
  if (normalized.includes('invalid signature') || normalized.includes('signature')) {
    return 'Cloudinary upload failed: invalid signature. This upload must use the unsigned preset, not a server-generated signature.';
  }
  if (normalized.includes('too large') || normalized.includes('file size') || failure.status === 413) {
    const limit = CLOUDINARY_SIZE_LIMITS[failure.resourceType];
    return `Cloudinary upload failed: file is too large${failure.fileSize ? ` (${formatBytes(failure.fileSize)})` : ''}. The limit for ${failure.resourceType === 'video' ? 'audio/video' : failure.resourceType} uploads is ${formatBytes(limit)}.`;
  }
  if (normalized.includes('invalid resource type') || normalized.includes('unsupported resource type')) {
    return `Cloudinary upload failed: "${failure.resourceType}" is the wrong resource type for this file.`;
  }
  if (
    normalized.includes('invalid image file') ||
    normalized.includes('invalid video file') ||
    normalized.includes('unsupported file') ||
    normalized.includes('not allowed') ||
    normalized.includes('format')
  ) {
    return `Cloudinary upload failed: ${raw}`;
  }
  if (failure.status === 401 || normalized.includes('unauthorized') || normalized.includes('api key')) {
    return 'Cloudinary upload failed: the Cloudinary credentials on the server were rejected. Check CLOUDINARY_URL in the deployment environment.';
  }
  if (failure.status === 420 || failure.status === 429 || normalized.includes('rate limit')) {
    return 'Cloudinary upload failed: the account hit its rate limit. Wait a moment and try again.';
  }

  return `Cloudinary upload failed: ${raw}`;
}

/** Pull Cloudinary's `{ error: { message, http_code } }` shape out of a response body. */
export function readCloudinaryError(payload: unknown): { message: string; code?: string | number } {
  if (!payload || typeof payload !== 'object') {
    return { message: typeof payload === 'string' ? payload : '' };
  }
  const body = payload as { error?: unknown; message?: unknown; developerMessage?: unknown };
  const error = body.error;
  if (typeof error === 'string') return { message: error };
  if (error && typeof error === 'object') {
    const detail = error as { message?: unknown; http_code?: unknown; code?: unknown };
    return {
      message: typeof detail.message === 'string' ? detail.message : '',
      code: typeof detail.http_code === 'number' || typeof detail.http_code === 'string'
        ? detail.http_code
        : (typeof detail.code === 'string' || typeof detail.code === 'number' ? detail.code : undefined)
    };
  }
  return { message: typeof body.message === 'string' ? body.message : '' };
}
