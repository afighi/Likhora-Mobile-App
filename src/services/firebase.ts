import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  // Only exists in the React Native build of firebase/auth. Metro resolves
  // that build at runtime, but TypeScript resolves the browser types, so the
  // import is valid on device even though the web typings do not list it.
  // @ts-ignore
  getReactNativePersistence,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD-wrlc8bR0dhUklZdoE8ALGr8cWl3-uIw",
  authDomain: "likhoraai.firebaseapp.com",
  projectId: "likhoraai",
  storageBucket: "likhoraai.firebasestorage.app",
  messagingSenderId: "927432952045",
  appId: "1:927432952045:android:99b45d02db9d63f44c24e4"
};

// Initialize Firebase App if not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * On native, Firebase Auth defaults to in-memory persistence — the user is
 * signed out every time the app is closed. Backing it with AsyncStorage keeps
 * the session across restarts, which is what people expect from a mobile app.
 *
 * The browser already persists to localStorage on its own, so getAuth is
 * correct there and initializeAuth would be redundant.
 */
const createAuth = () => {
  if (Platform.OS === 'web') return getAuth(app);

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh re-runs this module against an app that already has auth
    // initialized, which throws. The existing instance is the right one.
    return getAuth(app);
  }
};

export const auth = createAuth();

export const loginWithFirebase = async (email: string, pass: string) => {
  return await signInWithEmailAndPassword(auth, email, pass);
};

export const signUpWithFirebase = async (email: string, pass: string) => {
  return await createUserWithEmailAndPassword(auth, email, pass);
};

export const loginWithGoogleFirebase = async () => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

export const getGoogleSignInErrorMessage = (error: unknown) => {
  const code = (error as { code?: string } | undefined)?.code;

  switch (code) {
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in has not been enabled for this app yet.';
    case 'auth/unauthorized-domain':
      return 'This website is not authorized for Google sign-in.';
    case 'auth/network-request-failed':
      return 'Could not reach Google. Check your connection and try again.';
    default:
      return 'Google sign-in could not be completed. Please try again.';
  }
};

export const resetPasswordFirebase = async (email: string) => {
  return await sendPasswordResetEmail(auth, email);
};

export const logoutFirebase = async () => {
  return await firebaseSignOut(auth);
};

export { GoogleAuthProvider, signInWithCredential };
