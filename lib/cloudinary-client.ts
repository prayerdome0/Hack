import type { UploadResult } from '@/lib/types';

const CLOUDINARY_API_BASE = 'https://api.cloudinary.com/v1_1';

type SignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: string;
  signature: string;
  folder?: string;
};

type CloudinaryErrorPayload = { error?: { message?: string } };

const NOT_CONFIGURED_MESSAGE =
  'Media uploads are not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and ' +
  'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET for unsigned uploads (or CLOUDINARY_URL on ' +
  'the server as a fallback), then redeploy.';

/**
 * Reads the unsigned-upload configuration from public environment variables.
 * Unsigned uploads post directly from the browser using a pre-configured
 * unsigned upload preset — no API key or secret, and no server round-trip.
 * Returns null when the variables are not set.
 */
function tryGetUnsignedConfig(): { cloudName: string; uploadPreset: string } | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) return null;
  return { cloudName, uploadPreset };
}

/** Turns a raw Cloudinary error into a message that says what to do about it. */
function describeCloudinaryError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('unsigned')) {
    return (
      'The Cloudinary upload preset is not enabled for unsigned uploads. ' +
      'Mark it as unsigned in Cloudinary console → Settings → Upload, and check the preset name.'
    );
  }
  if (normalized.includes('too large') || normalized.includes('exceeds')) {
    return 'That file is too large for this Cloudinary plan. Try a smaller file.';
  }
  if (normalized.includes('invalid image')) {
    return 'Cloudinary could not read this image. Choose a JPG, PNG or WEBP file.';
  }
  if (normalized.includes('invalid video') || normalized.includes('audio')) {
    return 'Cloudinary could not read this audio file. Choose an MP3, WAV, M4A or OGG file.';
  }
  return `Cloudinary rejected this upload: ${message}`;
}

/** Browsers report M4A as video/mp4; Cloudinary serves audio via the video endpoint. */
function resourceTypeFor(file: File): 'image' | 'video' {
  return file.type.startsWith('audio/') || file.type === 'video/mp4' ? 'video' : 'image';
}

function uploadFile(
  file: File,
  options: { cloudName: string; resourceType: 'image' | 'video'; formData: FormData },
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const { cloudName, resourceType, formData } = options;
  const endpoint = `${CLOUDINARY_API_BASE}/${encodeURIComponent(cloudName)}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => {
      reject(
        new Error(
          'The media upload failed. Check your connection and try again. ' +
            'If this keeps happening, make sure your Cloudinary upload settings are configured and redeploy.'
        )
      );
    };
    xhr.onabort = () => reject(new Error('The media upload was cancelled.'));
    xhr.onload = () => {
      let payload: (UploadResult & CloudinaryErrorPayload) | undefined;
      try {
        payload = JSON.parse(xhr.responseText) as UploadResult & CloudinaryErrorPayload;
      } catch {
        payload = undefined;
      }

      // status 0 means the request never completed (CORS/network). `onload`
      // still fires in some browsers, so treat it like a network failure.
      if (xhr.status === 0) {
        reject(
          new Error(
            'The media upload failed. The request never reached the media service. ' +
              'Check your connection and try again.'
          )
        );
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload?.secure_url && payload.public_id) {
        onProgress?.(100);
        resolve(payload);
        return;
      }

      const message = payload?.error?.message;
      reject(new Error(message ? describeCloudinaryError(message) : 'Cloudinary rejected this upload.'));
    };
    xhr.send(formData);
  });
}

/** Asks the server for a signed upload request. Throws with a `code` when refused. */
async function requestSignedUpload(token: string, folder?: string): Promise<SignResponse> {
  const response = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ folder })
  });

  const payload = (await response.json().catch(() => ({}))) as SignResponse & {
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    const error = new Error(payload.error || 'Could not prepare the media upload.') as Error & {
      code?: string;
    };
    error.code = payload.code;
    throw error;
  }

  return payload;
}

function buildSignedFormData(file: File, signed: SignResponse) {
  const data = new FormData();
  data.append('file', file);
  data.append('api_key', signed.apiKey);
  data.append('timestamp', signed.timestamp);
  data.append('signature', signed.signature);
  if (signed.folder) data.append('folder', signed.folder);
  return data;
}

function buildUnsignedFormData(file: File, uploadPreset: string, folder?: string) {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', uploadPreset);
  if (folder) data.append('folder', folder);
  return data;
}

/**
 * Uploads a file to Cloudinary.
 *
 * Default mode: unsigned upload — the file is posted straight to Cloudinary
 * using the public cloud name and unsigned upload preset from
 * NEXT_PUBLIC_CLOUDINARY_* (no server involved, no API key or secret needed).
 *
 * Fallback: when those variables are unset and the server has CLOUDINARY_URL
 * configured, a signed upload request is used instead (the server signs the
 * request and the secret never reaches the browser).
 *
 * @param file     The file to upload.
 * @param folder   Optional Cloudinary folder path (e.g. `simz-naxty/audio`).
 * @param token    Optional Firebase ID token, only needed for the signed fallback.
 * @param onProgress Callback receiving upload progress (0–100).
 */
export async function uploadToCloudinary(
  file: File,
  folder?: string,
  token?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const resourceType = resourceTypeFor(file);

  // 1) Unsigned upload — the default mode.
  const unsigned = tryGetUnsignedConfig();
  if (unsigned) {
    const formData = buildUnsignedFormData(file, unsigned.uploadPreset, folder);
    return uploadFile(file, { cloudName: unsigned.cloudName, resourceType, formData }, onProgress);
  }

  // 2) Signed upload — fallback when unsigned variables are absent.
  if (token) {
    const signed = await requestSignedUpload(token, folder);
    const formData = buildSignedFormData(file, signed);
    return uploadFile(file, { cloudName: signed.cloudName, resourceType, formData }, onProgress);
  }

  throw new Error(NOT_CONFIGURED_MESSAGE);
}
