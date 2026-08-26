import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App | undefined;
let hasServiceAccount = false;

function getAdminApp() {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // The project ID must match the Firebase project the client authenticates
  // against. It defaults to the same `seedwel-cbeb8` project used by
  // `lib/firebase.ts`.
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'seedwel-cbeb8';

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawServiceAccount) {
    const serviceAccount = JSON.parse(rawServiceAccount);
    adminApp = initializeApp({ credential: cert(serviceAccount), projectId });
    hasServiceAccount = true;
    return adminApp;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    adminApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    hasServiceAccount = true;
    return adminApp;
  }

  // No service account available. Initializing with just the project ID is
  // enough to verify Firebase ID tokens (which is the only thing the upload
  // flow needs) — admin authorization comes from the `users/{uid}.role` field,
  // enforced by Firestore security rules, not from a server-side credential.
  adminApp = initializeApp({ projectId });
  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  if (!hasServiceAccount) {
    getAdminApp();
    if (!hasServiceAccount) {
      throw new Error(
        'Server-side Firestore access requires a service account. Add FIREBASE_SERVICE_ACCOUNT_JSON to your environment.'
      );
    }
  }
  return getFirestore(getAdminApp());
}
