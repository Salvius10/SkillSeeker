import { useState, useEffect } from 'react';
import { getNotifications, markAllRead } from '../api/client';
import type { Notification } from '../types';

const TYPE_EMOJI: Record<string, string> = {
  submission_approved: '🏆',
  submission_rejected: '📋',
  reaction_celebrate: '🎉',
  reaction_comment: '💬',
  new_challenge: '⚡',
  rank_change: '🔼',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

interface Props { onRead: () => void; }

export default function Notifications({ onRead }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications().then(data => {
      setNotifs(data);
      if (data.some((n: Notification) => !n.read)) {
        markAllRead().then(onRead);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {notifs.length === 0 && <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>No notifications yet.</div>}
      {notifs.map(n => (
        <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: n.read ? '#fff' : '#f0f5ff', border: '1px solid #e7edf8', borderRadius: 14, padding: '16px 20px' }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_EMOJI[n.type] ?? '🔔'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{n.message.split('·')[0].trim()}</div>
            {n.message.includes('·') && <div style={{ fontSize: 13, color: '#69748c', marginTop: 2 }}>{n.message.split('·').slice(1).join('·').trim()}</div>}
          </div>
          <div style={{ fontSize: 12, color: '#9aa3b5', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
