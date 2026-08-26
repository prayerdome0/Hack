import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

export async function requireUser(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new Response('Authentication required', { status: 401 });
  }
  try {
    return await getAdminAuth().verifyIdToken(authorization.slice('Bearer '.length));
  } catch {
    throw new Response('Invalid authentication token', { status: 401 });
  }
}

export async function requireAdmin(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new Response('Authentication required', { status: 401 });
  }

  const token = authorization.slice('Bearer '.length);
  let decoded: DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    throw new Response('Invalid authentication token', { status: 401 });
  }

  // Admin status comes from the Firestore `role` field only — no separate
  // admin configuration or custom claims are required. Clients can never write
  // this field under firestore.rules.
  const profile = await getAdminDb().collection('users').doc(decoded.uid).get();
  if (profile.data()?.role !== 'admin') {
    throw new Response('Admin access required', { status: 403 });
  }
  return decoded;
}

export function apiError(error: unknown) {
  if (error instanceof Response) return error;
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  console.error(message);
  return new Response('Unexpected server error', { status: 500 });
}
