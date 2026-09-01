import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  firestoreDatabaseId: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '',
  oAuthClientId: process.env.NEXT_PUBLIC_FIREBASE_OAUTH_CLIENT_ID || '',
};

// Initialize or retrieve existing Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Authentication with Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Cloud Firestore with explicit database ID if provisioned
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Server-side / Admin Auth stub & token validator
export const adminAuth = {
  async verifyIdToken(token: string) {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('AUTH_MISSING_TOKEN: Authorization token was not provided.');
    }
    return {
      uid: 'user_authenticated',
      token,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  },
};

export default app;

