import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/challenges':        { title: 'All Challenges',    sub: 'Browse and pick challenges to earn points' },
  '/my-challenges':     { title: 'My Challenges',     sub: 'Challenges you have claimed' },
  '/news':              { title: 'News Feed',          sub: "What's happening across the org" },
  '/leaderboard':       { title: 'Leaderboard',        sub: 'Rankings based on total points earned' },
  '/profile':           { title: 'My Profile',         sub: 'Your activity, streaks and badges' },
  '/notifications':     { title: 'Notifications',      sub: 'Activity updates' },
  '/admin/challenges':  { title: 'All Challenges',     sub: 'Manage and monitor every challenge' },
  '/admin/create':      { title: 'Create Challenge',   sub: 'Post a new challenge for the team' },
  '/admin/review':      { title: 'Submission Review',  sub: 'Review and approve pending submissions' },
  '/admin/analytics':   { title: 'Analytics',          sub: 'Program health at a glance' },
};

interface Props { unreadCount: number; }

export default function TopNav({ unreadCount }: Props) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = PAGE_META[pathname] ?? { title: 'Skill Seeker', sub: '' };
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <div className="topnav-padding" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 52px', height: 72,
      background: 'rgba(245,246,255,0.9)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(26,0,217,0.08)',
      flexShrink: 0, position: 'relative',
    }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(26,0,217,0.1) 30%, rgba(26,0,217,0.1) 70%, transparent 100%)' }} />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.7px', color: '#0e1523', fontFamily: "'Hanken Grotesk', sans-serif", lineHeight: 1.15 }}>
          {meta.title}
        </h1>
        {meta.sub && (
          <span style={{ fontSize: 12.5, color: '#a0a9bc', fontWeight: 500, lineHeight: 1 }}>{meta.sub}</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {user?.role !== 'admin' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, rgba(254,110,6,0.1) 0%, rgba(254,110,6,0.06) 100%)', border: '1px solid rgba(254,110,6,0.18)', borderRadius: 20, padding: '5px 13px', fontSize: 13, fontWeight: 700, color: '#fe6e06', fontFamily: "'JetBrains Mono', monospace", boxShadow: '0 1px 4px rgba(254,110,6,0.12)' }}>
            <Zap size={12} fill="rgba(254,110,6,0.3)" color="#fe6e06" />
            {(user?.points ?? 0).toLocaleString()} pts
          </div>
        )}

        <button
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          onClick={() => navigate('/notifications')}
          style={{ position: 'relative', cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'none', border: 'none', padding: 0, transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26,0,217,0.07)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        >
          <Bell size={18} style={{ color: '#6b7491' }} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -3, right: -3, background: 'linear-gradient(135deg, #fe6e06, #ff8c38)', color: '#fff', fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", border: '1.5px solid #f5f6ff', boxShadow: '0 2px 6px rgba(254,110,6,0.4)' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #1a00d9 0%, #413ff4 100%)', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 12px rgba(26,0,217,0.3)', border: '1.5px solid rgba(255,255,255,0.6)', letterSpacing: '-0.5px' }}>
          {initials}
        </div>
      </div>
    </div>
  );
}
