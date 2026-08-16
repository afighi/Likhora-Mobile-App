import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, logoutFirebase } from '@/services/firebase';
import { fetchUserProfile, syncUserProfile, UserProfile } from '@/services/supabase';

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create profile in Supabase
        const { data: profile } = await fetchUserProfile(firebaseUser.uid);
        if (profile) {
          setUserProfile(profile);
          setOnboardingCompleted(profile.onboarded ?? false);
        } else {
          // Initialize fallback profile
          const newProfile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            full_name: firebaseUser.displayName || 'Entrepreneur',
            onboarded: false,
          };
          setUserProfile(newProfile);
          setOnboardingCompleted(false);
          await syncUserProfile(newProfile);
        }
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
