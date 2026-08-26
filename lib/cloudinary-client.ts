import type { UploadResult } from '@/lib/types';

/**
 * Reads the Cloudinary cloud name and upload preset from public environment
 * variables. Unsigned uploads do not need an API key or secret — only the
 * cloud name and a pre-configured unsigned upload preset.
 */
function getUnsignedConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName) {
    throw new Error(
      'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set. Add it to your environment variables.'
    );
  }
  if (!uploadPreset) {
    throw new Error(
      'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is not set. Create an unsigned upload preset in your Cloudinary dashboard and add it to your environment variables.'
    );
  }
  return { cloudName, uploadPreset };
}

function uploadFile(
  file: File,
  cloudName: string,
  uploadPreset: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', uploadPreset);

  // Browsers commonly report M4A files as video/mp4 even though they contain
  // audio, and Cloudinary handles all audio through its `video` endpoint.
  const isAudio = file.type.startsWith('audio/') || file.type === 'video/mp4';
  const resourceType = isAudio ? 'video' : 'image';
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => {
      reject(new Error('The media upload failed. Check your connection and try again.'));
    };
    xhr.onabort = () => reject(new Error('The media upload was cancelled.'));
    xhr.onload = () => {
      let payload: (UploadResult & { error?: { message?: string } }) | undefined;
      try {
        payload = JSON.parse(xhr.responseText) as UploadResult & {
          error?: { message?: string };
        };
      } catch {
        payload = undefined;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload?.secure_url && payload.public_id) {
        onProgress?.(100);
        resolve(payload);
        return;
      }

      reject(new Error(payload?.error?.message || 'Cloudinary rejected this upload.'));
    };
    xhr.send(data);
  });
}

/**
 * Uploads a file to Cloudinary using an unsigned upload preset.
 * No API key or secret is required — only the cloud name and upload preset
 * configured in the Cloudinary dashboard.
 */
export async function uploadToCloudinary(
  file: File,
  _folder?: string,
  _token?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const { cloudName, uploadPreset } = getUnsignedConfig();
  return uploadFile(file, cloudName, uploadPreset, onProgress);
}
