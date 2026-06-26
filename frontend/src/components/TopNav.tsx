import { Bell, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PAGE_META: Record<string, { title: string; sub: string }> = {
  challenges: { title: 'Challenges', sub: 'Pick up work, earn points' },
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px', background: '#fff', borderBottom: '1px solid #e7edf8', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>{meta.title}</h1>
        <p style={{ margin: 0, fontSize: 14, color: '#9aa3b5' }}>{meta.sub}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f6f8fc', borderRadius: 10, padding: '6px 12px', fontSize: 13, fontWeight: 700 }}>
          <Star size={14} style={{ color: '#fe6e06' }} />
          <span>{(user?.points ?? 0).toLocaleString()} pts</span>
        </div>
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setPage('notifications')}>
          <Bell size={20} style={{ color: '#9aa3b5' }} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#fe6e06', color: '#fff', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}
