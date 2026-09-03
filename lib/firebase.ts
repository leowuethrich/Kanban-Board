import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/** true, wenn die Pflicht-Config vorhanden ist. Fehlt sie, bleibt die App auf
 *  dem Login-Screen mit einem Hinweis. */
export const firebaseReady = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

function ensureApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function getDb(): Firestore | null {
  if (!firebaseReady) return null;
  if (!db) db = getFirestore(ensureApp());
  return db;
}

export function getFirebaseAuth(): Auth | null {
  if (!firebaseReady) return null;
  if (!auth) auth = getAuth(ensureApp());
  return auth;
}
