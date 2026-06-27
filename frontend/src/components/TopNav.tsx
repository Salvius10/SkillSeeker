import { Bell, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PAGE_META: Record<string, { title: string; sub: string }> = {
  challenges: { title: 'Board', sub: 'Pick up work, earn points' },
  news: { title: 'News Feed', sub: "What's happening across the org" },
  leaderboard: { title: 'Leaderboard', sub: 'All-time and monthly team rankings' },
  profile: { title: 'My Profile', sub: 'Your activity and history' },
  notifications: { title: 'Notifications', sub: 'Activity updates' },
  'admin-challenges': { title: 'All Challenges', sub: 'Manage and monitor every challenge' },
  'admin-create': { title: 'Create Challenge', sub: 'Post a new challenge for the team' },
  'admin-review': { title: 'Submission Review', sub: 'Review and approve submissions' },
  'admin-analytics': { title: 'Analytics', sub: 'Program health at a glance' },
};

interface Props {
  page: string;
  setPage: (p: string) => void;
  unreadCount: number;
}

export default function TopNav({ page, setPage, unreadCount }: Props) {
  const { user } = useAuth();
  const meta = PAGE_META[page] ?? { title: 'Skill Seeker', sub: '' };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      background: 'rgba(250,248,255,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #dae2fd',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: '#131b2e', fontFamily: "'Hanken Grotesk', sans-serif" }}>{meta.title}</h1>
        {meta.sub && <p style={{ margin: 0, fontSize: 13.5, color: '#545567' }}>{meta.sub}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user?.role !== 'admin' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'linear-gradient(135deg, rgba(254,110,6,0.1) 0%, rgba(254,110,6,0.05) 100%)',
            border: '1px solid rgba(254,110,6,0.2)',
            borderRadius: 24,
            padding: '6px 14px',
            fontSize: 13.5,
            fontWeight: 700,
            color: '#fe6e06',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <Zap size={13} style={{ color: '#fe6e06' }} />
            {(user?.points ?? 0).toLocaleString()} pts
          </div>
        )}
        <button
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          style={{ position: 'relative', cursor: 'pointer', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#f2f3ff', border: '1px solid #dae2fd', padding: 0 }}
          onClick={() => setPage('notifications')}
        >
          <Bell size={18} style={{ color: '#454556' }} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#fe6e06',
              color: '#fff',
              fontSize: 9.5,
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              padding: '0 3px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              border: '1.5px solid #faf8ff',
            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1a00d9, #413ff4)', color: '#fff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(26,0,217,0.25)' }}>
          {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
        </div>
      </div>
    </div>
  );
}
