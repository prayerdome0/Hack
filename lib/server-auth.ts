import type { DecodedIdToken } from 'firebase-admin/auth';
import { ApiError } from '@/lib/api-error';
import { getAdminAuth } from '@/lib/firebase-admin';

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required', 'authentication_required');
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new ApiError(401, 'Authentication required', 'authentication_required');
  }
  return token;
}

// Verifying a Firebase ID token only needs the matching Firebase project ID;
// it does not require a service-account private key.
export async function requireUser(request: Request): Promise<DecodedIdToken> {
  const token = bearerToken(request);
  let auth;
  try {
    auth = getAdminAuth();
  } catch (error) {
    console.error('Firebase token verifier initialization failed:', error);
    throw new ApiError(
      503,
      'Authentication verification is not configured on the server.',
      'firebase_auth_not_configured'
    );
  }

  try {
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    throw new ApiError(401, 'Invalid authentication token', 'invalid_authentication_token');
  }
}

type FirestoreUserDocument = {
  fields?: {
    role?: { stringValue?: string };
  };
};

/**
 * Verifies the database-backed admin role without a Firebase service account.
 *
 * Firestore's REST API accepts the caller's Firebase ID token and evaluates
 * the deployed security rules. The existing users/{uid} self-read rule lets us
 * read only this caller's role, then this server route enforces `admin` before
 * issuing Cloudinary signatures or deleting media.
 */
export async function requireAdmin(request: Request): Promise<DecodedIdToken> {
  const token = bearerToken(request);
  const decoded = await requireUser(request);
  const projectId = decoded.aud;
  const userDocumentUrl = new URL(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(decoded.uid)}`
  );
  userDocumentUrl.searchParams.set('mask.fieldPaths', 'role');

  let response: Response;
  try {
    response = await fetch(userDocumentUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
  } catch (error) {
    console.error('Firestore admin-role lookup failed:', error);
    throw new ApiError(
      503,
      'Admin access could not be verified. Please try again.',
      'admin_verification_unavailable'
    );
  }

  if (response.status === 403 || response.status === 404) {
    throw new ApiError(403, 'Admin access required', 'admin_access_required');
  }
  if (!response.ok) {
    const providerMessage = await response.text().catch(() => '');
    console.error(
      `Firestore admin-role lookup returned ${response.status}:`,
      providerMessage.slice(0, 500)
    );
    throw new ApiError(
      503,
      'Admin access could not be verified. Please try again.',
      'admin_verification_unavailable'
    );
  }

  const profile = (await response.json()) as FirestoreUserDocument;
  if (profile.fields?.role?.stringValue !== 'admin') {
    throw new ApiError(403, 'Admin access required', 'admin_access_required');
  }

  return decoded;
}
