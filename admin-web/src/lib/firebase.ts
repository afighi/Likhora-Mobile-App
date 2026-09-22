// Same Firebase project as the mobile app (src/services/firebase.ts) —
// admins sign in with the same Firebase Auth, just checked against
// profiles.is_admin afterward (see lib/supabase.ts).
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyD-wrlc8bR0dhUklZdoE8ALGr8cWl3-uIw',
  authDomain: 'likhoraai.firebaseapp.com',
  projectId: 'likhoraai',
  storageBucket: 'likhoraai.firebasestorage.app',
  messagingSenderId: '927432952045',
  appId: '1:927432952045:android:99b45d02db9d63f44c24e4',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const loginWithFirebase = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const logoutFirebase = () => firebaseSignOut(auth);
