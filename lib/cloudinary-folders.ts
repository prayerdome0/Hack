/**
 * Shared Cloudinary folder paths used by both the admin upload forms and the
 * settings page. Keeping them in one place prevents drift between where files
 * are uploaded and where the UI says they will live.
 */
export const CLOUDINARY_FOLDERS = {
  audio: 'simz-naxty/audio',
  covers: 'simz-naxty/covers',
  artists: 'simz-naxty/artists',
  playlists: 'simz-naxty/playlists'
} as const;
