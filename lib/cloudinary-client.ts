import type { UploadResult } from '@/lib/types';

export type CloudinaryFolder =
  | 'simz-naxty/audio'
  | 'simz-naxty/covers'
  | 'simz-naxty/artists'
  | 'simz-naxty/playlists';

type UploadSignature = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
};

async function responseError(response: Response, fallback: string) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as { error?: unknown; message?: unknown };
      if (typeof payload.error === 'string' && payload.error) return payload.error;
      if (typeof payload.message === 'string' && payload.message) return payload.message;
    } catch {
      return fallback;
    }
  } else if (!contentType || contentType.includes('text/plain')) {
    const message = await response.text().catch(() => '');
    if (message.trim()) return message.trim().slice(0, 500);
  }
  return fallback;
}

function isUploadSignature(value: unknown): value is UploadSignature {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<UploadSignature>;
  return (
    typeof candidate.signature === 'string' &&
    typeof candidate.timestamp === 'number' &&
    typeof candidate.apiKey === 'string' &&
    typeof candidate.cloudName === 'string' &&
    typeof candidate.folder === 'string'
  );
}

function uploadFile(
  file: File,
  signature: UploadSignature,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const data = new FormData();
  data.append('file', file);
  data.append('api_key', signature.apiKey);
  data.append('timestamp', String(signature.timestamp));
  data.append('signature', signature.signature);
  data.append('folder', signature.folder);

  // Browsers commonly report M4A files as video/mp4 even though they contain
  // audio, and Cloudinary handles all audio through its `video` endpoint.
  const isAudio = file.type.startsWith('audio/') || file.type === 'video/mp4';
  const resourceType = isAudio ? 'video' : 'image';
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/${resourceType}/upload`;

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

export async function uploadToCloudinary(
  file: File,
  folder: CloudinaryFolder,
  token: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const signatureResponse = await fetch('/api/cloudinary/signature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ folder })
  });

  if (!signatureResponse.ok) {
    throw new Error(
      await responseError(signatureResponse, 'Could not authorize the media upload.')
    );
  }

  const signature = (await signatureResponse.json()) as unknown;
  if (!isUploadSignature(signature)) {
    throw new Error('The upload service returned an invalid response. Please try again.');
  }

  return uploadFile(file, signature, onProgress);
}
