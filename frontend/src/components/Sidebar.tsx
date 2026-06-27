import { LayoutGrid, Newspaper, Trophy, User, Bell, Plus, CheckSquare, BarChart2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Page = string;

interface Props {
  page: Page;
  setPage: (p: Page) => void;
  unreadCount: number;
  pendingReviewCount: number;
}

const navBtn = (active: boolean, visible: boolean): React.CSSProperties => ({
  display: visible ? 'flex' : 'none',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  border: 'none',
  background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
  color: active ? '#fff' : 'rgba(255,255,255,0.75)',
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 13.5,
  fontWeight: active ? 700 : 500,
  fontFamily: "'Hanken Grotesk', sans-serif",
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.15s, color 0.15s',
  boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.12)' : 'none',
});

const Badge = ({ n }: { n: number }) =>
  n > 0 ? (
    <span style={{
      background: '#fe6e06',
      color: '#fff',
      fontSize: 10.5,
      fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace",
      minWidth: 20,
      height: 20,
      padding: '0 5px',
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 'auto',
    }}>
      {n}
    </span>
  ) : null;

const SectionLabel = ({ label }: { label: string }) => (
  <div style={{ padding: '14px 14px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(161,164,255,0.9)', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
    {label}
  </div>
);

export default function Sidebar({ page, setPage, unreadCount, pendingReviewCount }: Props) {
  const { user, logout } = useAuth();
  const emp = user?.role === 'employee';
  const initials = user?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  const nav = (p: Page) => () => setPage(p);

  return (
    <div style={{
      width: 252,
      background: 'linear-gradient(180deg, #0f0099 0%, #1a00d9 40%, #2219f5 100%)',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 16px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: '#fe6e06', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0, boxShadow: '0 2px 8px rgba(254,110,6,0.4)' }}>S</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2, letterSpacing: '-0.2px' }}>Skill Seeker</div>
          <div style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.65, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>Challenge Hub</div>
        </div>
      </div>

      <SectionLabel label={emp ? 'Navigate' : 'Admin'} />

      <nav aria-label="Main navigation" style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '2px 10px', flex: 1, overflowY: 'auto' }}>
        {/* Employee nav */}
        <button aria-current={page === 'challenges' ? 'page' : undefined} onClick={nav('challenges')} style={navBtn(page === 'challenges', emp)}><LayoutGrid size={17} /><span style={{ flex: 1, textAlign: 'left' }}>Board</span></button>
        <button aria-current={page === 'news' ? 'page' : undefined} onClick={nav('news')} style={navBtn(page === 'news', emp)}><Newspaper size={17} /><span style={{ flex: 1, textAlign: 'left' }}>News Feed</span></button>
        <button aria-current={page === 'leaderboard' ? 'page' : undefined} onClick={nav('leaderboard')} style={navBtn(page === 'leaderboard', emp)}><Trophy size={17} /><span style={{ flex: 1, textAlign: 'left' }}>Leaderboard</span></button>
        <button aria-current={page === 'profile' ? 'page' : undefined} onClick={nav('profile')} style={navBtn(page === 'profile', emp)}><User size={17} /><span style={{ flex: 1, textAlign: 'left' }}>My Profile</span></button>
        <button aria-current={page === 'notifications' ? 'page' : undefined} onClick={nav('notifications')} style={navBtn(page === 'notifications', emp)}><Bell size={17} /><span style={{ flex: 1, textAlign: 'left' }}>Notifications</span><Badge n={unreadCount} /></button>

        {/* Admin nav */}
        <button aria-current={page === 'admin-challenges' ? 'page' : undefined} onClick={nav('admin-challenges')} style={navBtn(page === 'admin-challenges', !emp)}><LayoutGrid size={17} /><span style={{ flex: 1, textAlign: 'left' }}>All Challenges</span></button>
        <button aria-current={page === 'admin-create' ? 'page' : undefined} onClick={nav('admin-create')} style={navBtn(page === 'admin-create', !emp)}><Plus size={17} /><span style={{ flex: 1, textAlign: 'left' }}>Create Challenge</span></button>
        <button aria-current={page === 'admin-review' ? 'page' : undefined} onClick={nav('admin-review')} style={navBtn(page === 'admin-review', !emp)}><CheckSquare size={17} /><span style={{ flex: 1, textAlign: 'left' }}>Submission Review</span><Badge n={pendingReviewCount} /></button>
        <button aria-current={page === 'admin-analytics' ? 'page' : undefined} onClick={nav('admin-analytics')} style={navBtn(page === 'admin-analytics', !emp)}><BarChart2 size={17} /><span style={{ flex: 1, textAlign: 'left' }}>Analytics</span></button>
        <button aria-current={page === 'leaderboard' && !emp ? 'page' : undefined} onClick={nav('leaderboard')} style={navBtn(page === 'leaderboard', !emp)}><Trophy size={17} /><span style={{ flex: 1, textAlign: 'left' }}>Leaderboard</span></button>
        <button aria-current={page === 'notifications' && !emp ? 'page' : undefined} onClick={nav('notifications')} style={navBtn(page === 'notifications', !emp)}><Bell size={17} /><span style={{ flex: 1, textAlign: 'left' }}>Notifications</span><Badge n={unreadCount} /></button>
      </nav>

      {/* User footer */}
      <div
        onClick={logout}
        title="Click to sign out"
        style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
      >
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name}</div>
          <div style={{ fontSize: 11, opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{user?.team || user?.role}</div>
        </div>
        <LogOut size={16} style={{ opacity: 0.55, flexShrink: 0 }} />
      </div>
    </div>
  );
}
