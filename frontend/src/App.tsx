import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useAppContext } from './context/AppContext';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Login from './pages/Login';

const Challenges    = lazy(() => import('./pages/Challenges'));
const MyChallenges  = lazy(() => import('./pages/MyChallenges'));
const NewsFeed      = lazy(() => import('./pages/NewsFeed'));
const Leaderboard   = lazy(() => import('./pages/Leaderboard'));
const Profile       = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AllChallenges   = lazy(() => import('./pages/admin/AllChallenges'));
const CreateChallenge = lazy(() => import('./pages/admin/CreateChallenge'));
const SubmissionReview = lazy(() => import('./pages/admin/SubmissionReview'));
const Analytics       = lazy(() => import('./pages/admin/Analytics'));

const Spinner = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 28, height: 28, border: '2.5px solid rgba(26,0,217,0.12)', borderTop: '2.5px solid #1a00d9', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>
);

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/challenges" replace />;
  return <>{children}</>;
}

function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'admin' ? '/admin/challenges' : '/challenges'} replace />;
}

function Layout() {
  const { unreadCount, pendingReviewCount } = useAppContext();
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        body {
          font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
          background:
            radial-gradient(ellipse 1400px 900px at 15% -10%, rgba(26,0,217,0.055) 0%, transparent 65%),
            radial-gradient(ellipse 900px 700px at 85% 105%, rgba(254,110,6,0.04) 0%, transparent 65%),
            #f5f6ff;
          min-height: 100vh;
        }
        *:focus-visible { outline: 2px solid #1a00d9; outline-offset: 2px; border-radius: 4px; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(26,0,217,0.15); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(26,0,217,0.28); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
        @keyframes expandDown { from { opacity:0; transform:translateY(-6px); max-height:0; } to { opacity:1; transform:translateY(0); max-height:600px; } }
        @keyframes barFill { from { transform:scaleX(0); } to { transform:scaleX(1); } }
        @keyframes barFillV { from { transform:scaleY(0); } to { transform:scaleY(1); } }
        @keyframes backdropIn { from { opacity:0; } to { opacity:1; } }
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.72); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        button:not(:disabled) { transition: transform 80ms cubic-bezier(0.16,1,0.3,1), box-shadow 200ms cubic-bezier(0.16,1,0.3,1), background 150ms ease; }
        button:not(:disabled):active { transform: scale(0.96) !important; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
        @media (max-width: 768px) {
          .app-sidebar { display: none; }
          .app-content { padding: 16px 16px !important; }
          .topnav-padding { padding: 0 16px !important; }
        }
      `}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <div className="app-sidebar">
          <Sidebar unreadCount={unreadCount} pendingReviewCount={pendingReviewCount} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <TopNav unreadCount={unreadCount} />
          <div className="app-content" style={{ flex: 1, overflowY: 'auto', padding: '28px 52px', scrollBehavior: 'smooth' }}>
            <Suspense fallback={<Spinner />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <Spinner /> : user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DefaultRedirect />} />

        {/* Employee routes */}
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/my-challenges" element={<MyChallenges />} />
        <Route path="/news" element={<NewsFeed />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />

        {/* Admin routes */}
        <Route path="/admin/challenges" element={<RequireAdmin><AllChallenges /></RequireAdmin>} />
        <Route path="/admin/create" element={<RequireAdmin><CreateChallenge /></RequireAdmin>} />
        <Route path="/admin/review" element={<RequireAdmin><SubmissionReview /></RequireAdmin>} />
        <Route path="/admin/analytics" element={<RequireAdmin><Analytics /></RequireAdmin>} />

        {/* Catch-all */}
        <Route path="*" element={<DefaultRedirect />} />
      </Route>
    </Routes>
  );
}
