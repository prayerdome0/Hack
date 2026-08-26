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

/**
 * Reads the unsigned-upload configuration from public environment variables.
 * Unlike signed uploads, unsigned uploads need a pre-configured unsigned
 * preset on the Cloudinary account, so this path is only a fallback and is
 * reported clearly when the variables are missing.
 */
function getUnsignedConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Media uploads are not configured. Set CLOUDINARY_URL on the server (recommended) or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET, then redeploy.'
    );
  }

  return { cloudName, uploadPreset };
}

/** Turns a raw Cloudinary error into a message that says what to do about it. */
function describeCloudinaryError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('unsigned')) {
    return (
      'The Cloudinary upload preset is not enabled for unsigned uploads. ' +
      'Use CLOUDINARY_URL on the server instead, or mark the preset as unsigned in the Cloudinary dashboard.'
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
            'If this keeps happening, make sure CLOUDINARY_URL is configured on the server and redeploy.'
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
              'Check your connection, or configure CLOUDINARY_URL on the server and try again.'
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
 * Preferred flow: the server signs the request (signed uploads need no
 * unsigned preset and keep the API secret server-side). If the server has no
 * Cloudinary credentials configured, we fall back to an unsigned upload using
 * the NEXT_PUBLIC_CLOUDINARY_* variables.
 *
 * @param file     The file to upload.
 * @param folder   Optional Cloudinary folder path (e.g. `simz-naxty/audio`).
 * @param token    Optional Firebase ID token used to sign the upload server-side.
 * @param onProgress Callback receiving upload progress (0–100).
 */
export async function uploadToCloudinary(
  file: File,
  folder?: string,
  token?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const resourceType = resourceTypeFor(file);

  if (token) {
    try {
      const signed = await requestSignedUpload(token, folder);
      const formData = buildSignedFormData(file, signed);
      return await uploadFile(
        file,
        { cloudName: signed.cloudName, resourceType, formData },
        onProgress
      );
    } catch (error) {
      // Only fall back to unsigned when the server has no Cloudinary
      // credentials at all. Any other error (auth, network) is rethrown.
      if ((error as { code?: string })?.code !== 'cloudinary_not_configured') {
        throw error;
      }
    }
  }

  const { cloudName, uploadPreset } = getUnsignedConfig();
  const formData = buildUnsignedFormData(file, uploadPreset, folder);
  return uploadFile(file, { cloudName, resourceType, formData }, onProgress);
}
