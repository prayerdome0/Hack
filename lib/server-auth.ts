import { getAdminAuth } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

// Verifies the caller's Firebase ID token. Token verification only needs the
// Firebase project ID (no service account), so it works out of the box with
// the same project configured in `lib/firebase.ts`.
//
// Admin authorization is intentionally NOT checked here. "Admin" is a role on
// the `users/{uid}` document (`role === 'admin'`), and it is enforced by:
//   - Firestore security rules (`isAdmin()`), which block non-admins from
//     writing the catalog, and
//   - the client-side `AdminGuard`, which gates the admin UI from that role.
// A non-admin who reaches a protected route can therefore upload media but
// cannot publish or modify any catalog document.
export async function requireUser(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new Response('Authentication required', { status: 401 });
  }
  try {
    return await getAdminAuth().verifyIdToken(authorization.slice('Bearer '.length));
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Response('Invalid authentication token', { status: 401 });
  }
}

export function apiError(error: unknown) {
  if (error instanceof Response) return error;
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  console.error(message);
  return new Response('Unexpected server error', { status: 500 });
}
