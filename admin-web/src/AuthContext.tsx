import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { checkIsAdmin } from './lib/supabase';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  /** True while Firebase is resolving the initial session AND, once a user
   *  is found, while the is_admin check is in flight — the portal shows a
   *  loading screen rather than a flash of "Access Denied" during either. */
  loading: boolean;
}

const AuthCtx = createContext<AuthState>({ user: null, isAdmin: false, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({ user: null, isAdmin: false, loading: true });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, isAdmin: false, loading: false });
        return;
      }
      setState({ user, isAdmin: false, loading: true });
      const isAdmin = await checkIsAdmin(user.uid);
      setState({ user, isAdmin, loading: false });
    });
    return unsub;
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
