import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

// Initializing the Firebase Admin SDK can fail for configuration reasons (for
// example, FIREBASE_SERVICE_ACCOUNT_JSON is missing). That failure must not be
// swallowed and reported as "Invalid authentication token" — surface it as a
// clear server configuration error instead.
function adminConfigError(error: unknown) {
  console.error('Firebase Admin initialization failed:', error);
  return new Response(
    'Firebase Admin is not configured on the server. Add FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY) to your environment.',
    { status: 500 }
  );
}

function getAdminAuthSafe() {
  try {
    return getAdminAuth();
  } catch (error) {
    throw adminConfigError(error);
  }
}

export async function requireUser(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new Response('Authentication required', { status: 401 });
  }
  const auth = getAdminAuthSafe();
  try {
    return await auth.verifyIdToken(authorization.slice('Bearer '.length));
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
  const auth = getAdminAuthSafe();
  let decoded: DecodedIdToken;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Token verification failed:', error);
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
