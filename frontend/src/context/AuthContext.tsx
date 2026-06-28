import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { getMe } from '../api/client';

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ss_token'));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token) {
      getMe().then(setUser).catch(() => { setToken(null); localStorage.removeItem('ss_token'); });
    }
  }, [token]);

  // Handle forced logout dispatched by the API client on 401
  useEffect(() => {
    const handle = () => { setToken(null); setUser(null); };
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  const login = (t: string, u: User) => {
    localStorage.setItem('ss_token', t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('ss_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try { const u = await getMe(); setUser(u); } catch {}
  };

  return <Ctx.Provider value={{ user, token, login, logout, refreshUser }}>{children}</Ctx.Provider>;
}
