import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';
import { syncMe, getMe } from '../api/client';

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function handleSession(accessToken: string) {
    setToken(accessToken);
    try {
      await syncMe(accessToken);
      const u = await getMe();
      setUser(u);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 10000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token) {
        await handleSession(session.access_token);
      }
      clearTimeout(timeout);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
        await handleSession(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setToken(null);
      }
    });

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    try { const u = await getMe(); setUser(u); } catch {}
  };

  return (
    <Ctx.Provider value={{ user, token, loading, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}
