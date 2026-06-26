import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Login from './pages/Login';
import { getNotifications, getSubmissions } from './api/client';

const Challenges = lazy(() => import('./pages/Challenges'));
const NewsFeed = lazy(() => import('./pages/NewsFeed'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AllChallenges = lazy(() => import('./pages/admin/AllChallenges'));
const CreateChallenge = lazy(() => import('./pages/admin/CreateChallenge'));
const SubmissionReview = lazy(() => import('./pages/admin/SubmissionReview'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));

const Spinner = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 32, height: 32, border: '3px solid #e7edf8', borderTop: '3px solid #1a00d9', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>
);

export default function App() {
  const { user, token } = useAuth();
  const [page, setPage] = useState('challenges');
  const [filter, setFilter] = useState('all');
  const [minPoints, setMinPoints] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  // Redirect to correct default page on role change
  useEffect(() => {
    if (user?.role === 'admin') setPage('admin-challenges');
    else setPage('challenges');
  }, [user?.role]);

  // Poll unread notifications and pending reviews
  useEffect(() => {
    if (!token) return;
    const fetch = async () => {
      try {
        const notifs = await getNotifications();
        setUnreadCount(notifs.filter((n: { read: boolean }) => !n.read).length);
        if (user?.role === 'admin') {
          const subs = await getSubmissions();
          setPendingReviewCount(subs.filter((s: { status: string }) => s.status === 'pending').length);
        }
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, [token, user?.role]);

  if (!user) return <Login />;

  const pageEl = () => {
    switch (page) {
      case 'challenges': return <Challenges filter={filter} setFilter={setFilter} minPoints={minPoints} setMinPoints={setMinPoints} />;
      case 'news': return <NewsFeed />;
      case 'leaderboard': return <Leaderboard currentUserId={user.id} />;
      case 'profile': return <Profile />;
      case 'notifications': return <Notifications onRead={() => setUnreadCount(0)} />;
      case 'admin-challenges': return <AllChallenges />;
      case 'admin-create': return <CreateChallenge onCreated={() => setPage('admin-challenges')} />;
      case 'admin-review': return <SubmissionReview onReviewed={() => setPendingReviewCount(c => Math.max(0, c - 1))} />;
      case 'admin-analytics': return <Analytics />;
      default: return <Challenges filter={filter} setFilter={setFilter} minPoints={minPoints} setMinPoints={setMinPoints} />;
    }
  };

  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: 'flex', height: '100vh', background: '#f5f7fc', overflow: 'hidden' }}>
        <Sidebar page={page} setPage={setPage} unreadCount={unreadCount} pendingReviewCount={pendingReviewCount} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopNav page={page} setPage={setPage} unreadCount={unreadCount} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            <Suspense fallback={<Spinner />}>{pageEl()}</Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
