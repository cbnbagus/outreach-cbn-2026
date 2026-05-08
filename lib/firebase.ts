// Firebase client SDK — client-side only, lazy initialized
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || "AIzaSyBwDi5SOFvQU_k-2U36V8vphzTs7Df6lSw",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || "reachthesoul-prod.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || "reachthesoul-prod",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || "reachthesoul-prod.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "211204916402",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || "1:211204916402:web:c906137a259dfc675bb5ab",
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     || "G-EN9GZFLR7W",
};

// Lazy singletons — only initialized in browser, never during SSR
let _app:  FirebaseApp | undefined;
let _auth: Auth       | undefined;
let _db:   Firestore  | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
  }
  return _db;
}

// Convenience re-exports — safe to use in client components
// Calling these at module level inside client components is fine;
// Next.js only SSR-evaluates server components.
export const auth = getFirebaseAuth();
export const db   = getFirebaseDb();
