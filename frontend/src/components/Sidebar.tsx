import { LayoutGrid, Newspaper, Trophy, User, Bell, Plus, CheckSquare, BarChart2, ArrowRight } from 'lucide-react';
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
  background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
  color: '#fff',
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: active ? 700 : 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',
});

const Badge = ({ n }: { n: number }) =>
  n > 0 ? (
    <span style={{ background: '#fe6e06', color: '#fff', fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>
      {n}
    </span>
  ) : null;

export default function Sidebar({ page, setPage, unreadCount, pendingReviewCount }: Props) {
  const { user, logout } = useAuth();
  const emp = user?.role === 'employee';
  const initials = user?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  const nav = (p: Page) => () => setPage(p);

  return (
    <div style={{ width: 248, background: 'linear-gradient(180deg, #1a00d9 0%, #2219f5 100%)', display: 'flex', flexDirection: 'column', color: '#fff', overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fe6e06', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0 }}>S</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Skill Seeker</div>
          <div style={{ fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.8 }}>Challenge Hub</div>
        </div>
      </div>

      {/* Section label */}
      <div style={{ padding: '4px 14px 6px', marginTop: 8, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#9fabff' }}>
        {emp ? 'MENU' : 'ADMIN'}
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 12px', flex: 1, overflowY: 'auto' }}>
        {/* Employee nav */}
        <button onClick={nav('challenges')} style={navBtn(page === 'challenges', emp)}><LayoutGrid size={18} /><span style={{ flex: 1, textAlign: 'left' }}>Challenges</span></button>
        <button onClick={nav('news')} style={navBtn(page === 'news', emp)}><Newspaper size={18} /><span style={{ flex: 1, textAlign: 'left' }}>News Feed</span></button>
        <button onClick={nav('leaderboard')} style={navBtn(page === 'leaderboard', emp)}><Trophy size={18} /><span style={{ flex: 1, textAlign: 'left' }}>Leaderboard</span></button>
        <button onClick={nav('profile')} style={navBtn(page === 'profile', emp)}><User size={18} /><span style={{ flex: 1, textAlign: 'left' }}>My Profile</span></button>
        <button onClick={nav('notifications')} style={navBtn(page === 'notifications', emp)}><Bell size={18} /><span style={{ flex: 1, textAlign: 'left' }}>Notifications</span><Badge n={unreadCount} /></button>

        {/* Admin nav */}
        <button onClick={nav('admin-challenges')} style={navBtn(page === 'admin-challenges', !emp)}><LayoutGrid size={18} /><span style={{ flex: 1, textAlign: 'left' }}>All Challenges</span></button>
        <button onClick={nav('admin-create')} style={navBtn(page === 'admin-create', !emp)}><Plus size={18} /><span style={{ flex: 1, textAlign: 'left' }}>Create Challenge</span></button>
        <button onClick={nav('admin-review')} style={navBtn(page === 'admin-review', !emp)}><CheckSquare size={18} /><span style={{ flex: 1, textAlign: 'left' }}>Submission Review</span><Badge n={pendingReviewCount} /></button>
        <button onClick={nav('admin-analytics')} style={navBtn(page === 'admin-analytics', !emp)}><BarChart2 size={18} /><span style={{ flex: 1, textAlign: 'left' }}>Analytics</span></button>
        <button onClick={nav('leaderboard')} style={navBtn(page === 'leaderboard', !emp)}><Trophy size={18} /><span style={{ flex: 1, textAlign: 'left' }}>Leaderboard</span></button>
        <button onClick={nav('notifications')} style={navBtn(page === 'notifications', !emp)}><Bell size={18} /><span style={{ flex: 1, textAlign: 'left' }}>Notifications</span><Badge n={unreadCount} /></button>
      </nav>

      {/* User footer */}
      <div onClick={logout} title="Click to sign out" style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', color: '#1a00d9', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name}</div>
          <div style={{ fontSize: 11, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.team || user?.role}</div>
        </div>
        <ArrowRight size={18} style={{ opacity: 0.7, flexShrink: 0 }} />
      </div>
    </div>
  );
}
