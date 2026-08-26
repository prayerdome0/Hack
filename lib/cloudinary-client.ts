import {
  CLOUDINARY_UPLOAD_PRESET,
  checkFileSize,
  fileExtension,
  resourceTypeFor
} from '@/lib/cloudinary-shared';
import { recordUpload } from '@/lib/firestore';
import type { UploadRecord, UploadResult } from '@/lib/types';

type CloudinaryErrorPayload = {
  error?: string | { message?: unknown };
  message?: string;
  uploadPreset?: string;
  cloudinary?: {
    httpStatus?: number;
    cloudinaryMessage?: string;
    errorCode?: string | number | null;
    resourceType?: string;
    endpoint?: string;
    uploadPreset?: string;
  };
};

/**
 * Read the real error the API returned.
 *
 * The route already produces an actionable, Cloudinary-derived sentence, so it
 * is surfaced verbatim. There is deliberately no generic
 * "Cloudinary rejected this upload…" fallback: the only case without a
 * provider message is a transport failure, which is described as such.
 */
function errorMessage(payload: CloudinaryErrorPayload | undefined, status: number) {
  const providerError = payload?.error;
  if (typeof providerError === 'string' && providerError.trim()) return providerError.trim();
  if (providerError && typeof providerError === 'object' && 'message' in providerError) {
    const message = (providerError as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
  if (typeof payload?.cloudinary?.cloudinaryMessage === 'string' && payload.cloudinary.cloudinaryMessage.trim()) {
    return `Cloudinary upload failed: ${payload.cloudinary.cloudinaryMessage.trim()}`;
  }
  return `Cloudinary upload failed: the server returned HTTP ${status} with no error message.`;
}

/** In development, log the full safe Cloudinary diagnostic in the browser console too. */
function logDevelopmentDiagnostic(payload: CloudinaryErrorPayload | undefined) {
  if (process.env.NODE_ENV === 'production') return;
  if (!payload?.cloudinary) return;
  // Only non-secret fields ever reach the browser: status, message, code,
  // resource type, endpoint and preset name.
  console.error('[cloudinary] upload failed', payload.cloudinary);
}

/**
 * Upload through our authenticated server route, which performs the unsigned
 * `Seedwell` upload against cloud `dhad95cch`.
 *
 * No Cloudinary environment variable, API key or API secret is ever read in
 * the browser. The legacy folder argument is retained for callers but ignored:
 * this app does not create folders.
 */
export async function uploadToCloudinary(
  file: File,
  _legacyFolder: string | undefined,
  token: string,
  onProgress?: (progress: number) => void,
  publicId?: string,
  uploadedBy?: string
): Promise<UploadResult> {
  // Enforce the application's upload limit before a byte leaves the browser.
  const resourceType = resourceTypeFor({ name: file.name, type: file.type });
  const size = checkFileSize({ name: file.name, size: file.size }, resourceType);
  if (!size.ok) throw new Error(size.message);

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
      try {
        payload = JSON.parse(xhr.responseText) as UploadResult & CloudinaryErrorPayload;
      } catch {
        /* handled below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.secure_url && payload.public_id) {
        onProgress?.(100);
        const result = payload;
        // Cloudinary confirmed the upload, so the record can be saved. A
        // rejected upload never reaches this branch, so no fake record is
        // created. A bookkeeping failure must not fail the upload itself.
        void saveUploadRecord(result, file, uploadedBy).catch((error) => {
          console.error('[cloudinary] upload succeeded but the record could not be saved', error);
        });
        resolve(result);
        return;
      }
      logDevelopmentDiagnostic(payload);
      reject(new Error(errorMessage(payload, xhr.status)));
    };
    xhr.send(form);
  });
}

/** Build and persist the upload record from Cloudinary's confirmed response. */
async function saveUploadRecord(result: UploadResult, file: File, uploadedBy?: string) {
  const record: UploadRecord = {
    fileName: file.name || result.original_filename || result.public_id,
    cloudinaryPublicId: result.public_id,
    secureUrl: result.secure_url,
    resourceType: (result.resource_type as UploadRecord['resourceType']) || resourceTypeFor({ name: file.name, type: file.type }),
    format: result.format || fileExtension(file.name),
    bytes: typeof result.bytes === 'number' ? result.bytes : file.size,
    uploadedAt: result.created_at || new Date().toISOString(),
    uploadedBy: uploadedBy || 'unknown'
  };
  await recordUpload(record);
}

export { CLOUDINARY_UPLOAD_PRESET };
