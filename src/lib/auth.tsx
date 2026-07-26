import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';

// ─── Context shape ───────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Fetch user_profile for the authenticated user
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch user profile:', error.message);
      setProfile(null);
    } else {
      setProfile(data as UserProfile);
    }
  };

  useEffect(() => {
    // 1. Check for an existing session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────

/** Access the current auth state. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/** Convenience hook: returns the current user's tenant_id or throws. */
export function useTenantId(): string {
  const { profile } = useAuth();
  if (!profile?.tenant_id) {
    throw new Error('No tenant_id available — is the user profile loaded?');
  }
  return profile.tenant_id;
}
