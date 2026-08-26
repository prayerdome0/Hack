import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Public Firebase web configuration. These values identify the project to the
// browser and are safe to ship in client bundles. They can be overridden per
// environment by setting the matching NEXT_PUBLIC_FIREBASE_* variables.
const defaultFirebaseConfig = {
  apiKey: 'AIzaSyCRliF-XdpgdNRyLvIrLEeCIBf_CF3E0nU',
  authDomain: 'seedwel-cbeb8.firebaseapp.com',
  projectId: 'seedwel-cbeb8',
  storageBucket: 'seedwel-cbeb8.firebasestorage.app',
  messagingSenderId: '1027325152362',
  appId: '1:1027325152362:web:fb813e933ab8aa3b8d0e13',
  measurementId: 'G-5GXW526PFT'
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let analytics: Analytics | undefined;

if (typeof window !== 'undefined' && firebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  // Analytics is optional and only initialized in a browser where Firebase supports it.
  try { analytics = getAnalytics(app); } catch { analytics = undefined; }
}

export { app, auth, db, analytics };
