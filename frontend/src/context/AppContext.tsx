import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getUnreadCount, getSubmissions, subscribeToNotifications } from '../api/client';
import type { Notification } from '../types';

interface AppCtx {
  unreadCount: number;
  pendingReviewCount: number;
  clearUnread: () => void;
  decrementPending: () => void;
}

const Ctx = createContext<AppCtx>(null!);
export const useAppContext = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    if (!token) { setUnreadCount(0); return; }
    getUnreadCount().then(setUnreadCount).catch(() => {});
    const es = subscribeToNotifications(token, (notif: Notification) => {
      setUnreadCount(c => c + 1);
      if (user?.role === 'admin' && (notif.type === 'new_submission' || notif.type === 'resubmission')) {
        setPendingReviewCount(c => c + 1);
      }
    });
    return () => es.close();
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') { setPendingReviewCount(0); return; }
    getSubmissions()
      .then((subs: { status: string }[]) => setPendingReviewCount(subs.filter(s => s.status === 'pending').length))
      .catch(() => {});
  }, [token, user?.role]);

  return (
    <Ctx.Provider value={{
      unreadCount,
      pendingReviewCount,
      clearUnread: () => setUnreadCount(0),
      decrementPending: () => setPendingReviewCount(c => Math.max(0, c - 1)),
    }}>
      {children}
    </Ctx.Provider>
  );
}
