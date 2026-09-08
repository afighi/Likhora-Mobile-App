import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, logoutFirebase } from '@/services/firebase';
import { fetchUserProfile, UserProfile } from '@/services/supabase';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  onboardingCompleted: boolean;
  setUserProfile: (profile: UserProfile | null) => void;
  setOnboardingCompleted: (status: boolean) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isLoading: true,
  onboardingCompleted: false,
  setUserProfile: () => {},
  setOnboardingCompleted: () => {},
  refreshProfile: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // A profile fetch can come back with no data in two very different
    // situations that look identical from here: a genuinely missing row,
    // or an RLS SELECT policy silently filtering the row out (that's not
    // an error in Postgres — only INSERT/UPDATE raise one when denied; a
    // filtered SELECT just returns empty). There is no reliable way to
    // tell those apart from a plain read, and every real account-creation
    // path in this app (signup.tsx, login.tsx's Google handler) already
    // writes the profile row itself before this ever runs — so this
    // listener should never try to guess "must be a new user" and create
    // one. Doing that before was resetting onboarding to false on every
    // single reload whenever the read got silently filtered, since that
    // looked exactly like "no data, no error" every time.
    const loadProfileForUser = async (
      firebaseUser: FirebaseUser,
      attempt: number = 1
    ): Promise<void> => {
      const { data: profile, error: profileError } = await fetchUserProfile(firebaseUser.uid);

      if (profile) {
        setUserProfile(profile);
        setOnboardingCompleted(profile.onboarded ?? false);
        return;
      }

      if (profileError) {
        console.warn(`[AuthContext] fetchUserProfile failed (attempt ${attempt}):`, profileError);
      }

      // Retry regardless of whether there was an explicit error — covers
      // both a transient failure and the token-restore race documented in
      // services/supabase.ts's accessToken callback.
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 700));
        return loadProfileForUser(firebaseUser, attempt + 1);
      }

      // Out of retries and still no row. Fail open: keep the session
      // usable without forcing this user through onboarding or touching
      // the stored profile. `onboarded: true` here only affects this
      // session's local state — the next successful fetch (this session
      // resuming, or a later one) loads and applies the real value.
      console.warn('[AuthContext] No profile found after retries — keeping local session, not writing anything.');
      setUserProfile({
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        full_name: firebaseUser.displayName || 'Entrepreneur',
        onboarded: true,
      });
      setOnboardingCompleted(true);
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadProfileForUser(firebaseUser);
      } else {
        setUserProfile(null);
        setOnboardingCompleted(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const { data } = await fetchUserProfile(user.uid);
      if (data) {
        setUserProfile(data);
        setOnboardingCompleted(data.onboarded ?? false);
      }
    }
  };

  const logout = async () => {
    await logoutFirebase();
    setUser(null);
    setUserProfile(null);
    setOnboardingCompleted(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        onboardingCompleted,
        setUserProfile,
        setOnboardingCompleted,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
