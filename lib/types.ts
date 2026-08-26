export type UserRole = 'user' | 'admin';

export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt?: unknown;
}

export interface Song {
  id: string;
  title: string;
  artistId?: string;
  artistName: string;
  albumId?: string;
  albumName?: string;
  genre?: string;
  audioUrl: string;
  coverUrl?: string;
  duration?: number;
  lyrics?: string;
  releaseDate?: string;
  description?: string;
  featured?: boolean;
  published?: boolean;
  playCount?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  audioPublicId?: string;
  coverPublicId?: string;
}

export interface Artist {
  id: string;
  name: string;
  biography?: string;
  profileImage?: string;
  genre?: string;
  createdAt?: unknown;
}

export interface Album {
  id: string;
  title: string;
  artistId?: string;
  artistName: string;
  coverUrl?: string;
  releaseDate?: string;
  description?: string;
  songIds?: string[];
  createdAt?: unknown;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  artworkUrl?: string;
  songIds: string[];
  ownerId?: string;
  ownerName?: string;
  isPublic?: boolean;
  featured?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RecentlyPlayed {
  id: string;
  userId: string;
  songId: string;
  song?: Song;
  lastPlayedAt?: unknown;
  playCount?: number;
}

export interface UploadMetadata {
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  resourceType: 'image' | 'video' | 'raw';
  format?: string;
  fileSize?: number;
  uploadedBy?: string;
  uploadedAt?: string;
  relatedId?: string;
}

export interface ImageMetadata extends UploadMetadata {
  resourceType: 'image';
  format?: 'jpg' | 'png' | 'webp' | 'gif' | 'svg';
}

export interface AudioMetadata extends UploadMetadata {
  resourceType: 'video'; // Audio uploaded as video resource type
  duration?: number;
  format?: string;
}

export interface DocumentMetadata extends UploadMetadata {
  resourceType: 'raw';
  format?: string;
  pageCount?: number;
}

export type FileMetadata = ImageMetadata | AudioMetadata | DocumentMetadata;

export interface UploadResult {
  secure_url: string;
  public_id: string;
  duration?: number;
  resource_type: string;
  bytes: number;
  format?: string;
}
