import type { UploadResult } from '@/lib/types';

type CloudinaryErrorPayload = { error?: string; message?: string };

function describeError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('unsigned') || normalized.includes('upload preset')) {
    return 'The Cloudinary upload preset Seedwell is not available for this file. Check the preset in Cloudinary console.';
  }
  if (normalized.includes('too large') || normalized.includes('exceeds')) {
    return 'That file is too large for this Cloudinary plan. Try a smaller file.';
  }
  return `Cloudinary rejected this upload: ${message}`;
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
      const message = payload?.error || payload?.message || 'Cloudinary rejected this upload.';
      reject(new Error(describeError(message)));
    };
    xhr.send(form);
  });
}
