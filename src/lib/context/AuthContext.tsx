import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session, SignInWithPasswordCredentials } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (credentials: SignInWithPasswordCredentials) => Promise<{ error: any }>;
  logout: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  login: async () => ({ error: null }),
  logout: async () => ({ error: null }),
});

export const useAuth = () => {
  return useContext(AuthContext);
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: SignInWithPasswordCredentials) => {
    return await supabase.auth.signInWithPassword(credentials);
  };

  const logout = async () => {
    return await supabase.auth.signOut();
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
