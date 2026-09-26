import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCustomToken } from 'firebase/auth';
import api from './api/axiosInstance';

// Firebase Client Configuration
// Reads from Vite environment variables with graceful fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDummyKeyForStockSenseDevelopment2026',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'stocksense-odoo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'stocksense-odoo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'stocksense-odoo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '102938475612',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:102938475612:web:9876543210fedcba',
};

// Initialize Firebase App singleton safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Send Real-Time Firebase Email OTP
 * Strictly checks registration status on backend
 */
export async function sendFirebaseEmailOtp(email, mode = 'login') {
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const endpoint = mode === 'signup' ? '/auth/send-signup-otp' : '/auth/firebase/send-otp';
  const res = await api.post(endpoint, {
    email: email.trim().toLowerCase(),
    loginOrEmail: email.trim().toLowerCase(),
    mode,
  });

  return res.data;
}

/**
 * Verify Real-Time Firebase Email OTP
 * Strictly validates 6-digit OTP and authenticates user session
 */
export async function verifyFirebaseEmailOtp(email, otp) {
  if (!email || !otp) {
    throw new Error('Email address and 6-digit OTP are required.');
  }

  const cleanOtp = String(otp).replace(/\s+/g, '');
  if (cleanOtp.length !== 6) {
    throw new Error('Please enter the complete 6-digit verification code.');
  }

  const res = await api.post('/auth/firebase/verify-otp', {
    email: email.trim().toLowerCase(),
    otp: cleanOtp,
  });

  // If a Firebase custom token was generated, authenticate with Firebase Client SDK
  if (res.data.firebaseCustomToken) {
    try {
      await signInWithCustomToken(auth, res.data.firebaseCustomToken);
    } catch (fbErr) {
      console.warn('[Firebase] Custom token client sync note:', fbErr.message);
    }
  }

  return res.data;
}

/**
 * Firebase Google Sign-In with popup
 */
export async function signInWithFirebaseGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();

    const res = await api.post('/auth/google', {
      token: idToken,
      email: result.user.email,
      name: result.user.displayName,
      photoURL: result.user.photoURL,
    });

    return res.data;
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Sign-In was cancelled.');
    }
    throw err;
  }
}

export default app;
