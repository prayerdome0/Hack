import type { UploadResult } from '@/lib/types';

export type CloudinaryFolder = 'simz-naxty/audio' | 'simz-naxty/covers' | 'simz-naxty/artists' | 'simz-naxty/playlists';

export function uploadToCloudinary(
  file: File,
  folder: CloudinaryFolder,
  token: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const signatureResponse = await fetch('/api/cloudinary/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ folder })
      });
      if (!signatureResponse.ok) throw new Error(await signatureResponse.text() || 'Could not authorize media upload.');
      const signature = await signatureResponse.json() as {
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        folder: string;
      };

      const data = new FormData();
      data.append('file', file);
      data.append('api_key', signature.apiKey);
      data.append('timestamp', String(signature.timestamp));
      data.append('signature', signature.signature);
      data.append('folder', signature.folder);

      const resourceType = file.type.startsWith('audio/') ? 'video' : 'image';
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onerror = () => reject(new Error('The media upload failed. Check your connection and try again.'));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText) as UploadResult);
        } else {
          try {
            const payload = JSON.parse(xhr.responseText) as { error?: { message?: string } };
            reject(new Error(payload.error?.message || 'Cloudinary rejected this upload.'));
          } catch {
            reject(new Error('Cloudinary rejected this upload.'));
          }
        }
      };
      xhr.send(data);
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Could not upload media.'));
    }
  });
}
