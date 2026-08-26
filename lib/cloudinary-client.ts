import type { UploadResult } from '@/lib/types';

type CloudinaryErrorPayload = {
  error?: string | { message?: unknown };
  message?: string;
};

function describeError(message: string) {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return 'Cloudinary rejected this upload. Try again or check the Cloudinary account configuration.';
  if (normalized.includes('unsigned') || normalized.includes('upload preset')) {
    return 'Cloudinary upload configuration rejected this file. Check the Cloudinary account configuration.';
  }
  if (normalized.includes('too large') || normalized.includes('exceeds')) {
    return 'That file is too large for this Cloudinary plan. Try a smaller file.';
  }
  // Avoid displaying the same prefix twice when an API already returns a
  // human-readable Cloudinary error.
  return normalized.startsWith('cloudinary rejected this upload:')
    ? message.trim()
    : `Cloudinary rejected this upload: ${message.trim()}`;
}

function errorMessage(payload: CloudinaryErrorPayload | undefined) {
  const providerError = payload?.error;
  if (typeof providerError === 'string') return providerError;
  if (providerError && typeof providerError === 'object' && 'message' in providerError) {
    const message = (providerError as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return typeof payload?.message === 'string' ? payload.message : '';
}

/**
 * Upload through our server route. This deliberately does not read any
 * Cloudinary environment variable in the browser. The legacy folder argument
 * is retained for callers but ignored: this app does not create folders.
 */
export async function uploadToCloudinary(
  file: File,
  _legacyFolder: string | undefined,
  token: string,
  onProgress?: (progress: number) => void,
  publicId?: string
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  if (publicId) form.append('public_id', publicId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/cloudinary/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error('The media upload failed. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('The media upload was cancelled.'));
    xhr.onload = () => {
      let payload: (UploadResult & CloudinaryErrorPayload) | undefined;
      try { payload = JSON.parse(xhr.responseText) as UploadResult & CloudinaryErrorPayload; } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.secure_url && payload.public_id) {
        onProgress?.(100);
        resolve(payload);
        return;
      }
      const message = errorMessage(payload);
      reject(new Error(describeError(message)));
    };
    xhr.send(form);
  });
}
