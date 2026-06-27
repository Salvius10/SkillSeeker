import { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { getNotifications, markNotificationRead, subscribeToNotifications } from '../api/client';
import type { Notification } from '../types';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
  surface: '#ffffff',
  surfaceLow: '#f2f3ff',
  border: '#dae2fd',
  text: '#131b2e',
  textSec: '#454556',
  textMuted: '#767588',
  success: '#10b981',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const TYPE_CONFIG: Record<string, { emoji: string; accent: string; bg: string }> = {
  submission_approved: { emoji: '🏆', accent: C.success,   bg: 'rgba(16,185,129,0.05)' },
  submission_rejected: { emoji: '📋', accent: C.orange,    bg: 'rgba(254,110,6,0.05)'  },
  reaction_celebrate:  { emoji: '🎉', accent: C.orange,    bg: 'rgba(254,110,6,0.05)'  },
  reaction_comment:    { emoji: '💬', accent: '#8b5cf6',   bg: 'rgba(139,92,246,0.05)' },
  new_challenge:       { emoji: '⚡', accent: C.primary,   bg: 'rgba(26,0,217,0.05)'   },
  rank_change:         { emoji: '🔼', accent: '#06b6d4',   bg: 'rgba(6,182,212,0.05)'  },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

function groupByTime(notifs: Notification[]) {
  const now = new Date();
  const today: Notification[] = [], yesterday: Notification[] = [], week: Notification[] = [], older: Notification[] = [];
  for (const n of notifs) {
    const diff = Math.floor((now.getTime() - new Date(n.created_at).getTime()) / 86400000);
    if (diff < 1) today.push(n);
    else if (diff < 2) yesterday.push(n);
    else if (diff < 7) week.push(n);
    else older.push(n);
  }
  return [
    { label: 'Today', items: today },
    { label: 'Yesterday', items: yesterday },
    { label: 'This Week', items: week },
    { label: 'Older', items: older },
  ].filter(g => g.items.length > 0);
}

type Filter = 'all' | 'submissions' | 'reactions' | 'challenges';

interface Props {
  onRead: () => void;
  onNavigate?: (page: string) => void;
}

export default function Notifications({ onRead, onNavigate }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    getNotifications().then(setNotifs).finally(() => setLoading(false));
    const es = subscribeToNotifications(incoming => {
      setNotifs(prev => [incoming, ...prev]);
    });
    return () => es.close();
  }, []);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const stillUnread = notifs.filter(n => n.id !== id && !n.read).length;
    if (stillUnread === 0) onRead();
  };

  const filtered = notifs.filter(n => {
    if (filter === 'submissions') return n.type.startsWith('submission_');
    if (filter === 'reactions') return n.type.startsWith('reaction_');
    if (filter === 'challenges') return n.type === 'new_challenge';
    return true;
  });

  const groups = groupByTime(filtered);
  const unreadCount = notifs.filter(n => !n.read).length;

  const pillStyle = (f: Filter): React.CSSProperties => ({
    background: filter === f ? C.primary : C.surface,
    color: filter === f ? '#fff' : C.textSec,
    border: filter === f ? 'none' : '1px solid #dae2fd',
    borderRadius: 24,
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: C.sans,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  if (loading) return (
    <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>
      <div style={{ width: 36, height: 36, border: `3px solid #dae2fd`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', animation: 'fadeIn 0.2s ease' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {(['all', 'submissions', 'reactions', 'challenges'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={pillStyle(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        {unreadCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5, fontFamily: C.mono }}>
            <CheckCheck size={14} color={C.primary} />
            {unreadCount} unread
          </span>
        )}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, background: C.surface, border: '1px solid #dae2fd', borderRadius: 16 }}>
          <Bell size={40} color='#dae2fd' style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 700, color: C.textSec }}>No notifications here</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>You're all caught up!</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {groups.map(group => (
          <div key={group.label}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: C.mono, marginBottom: 8 }}>{group.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map(n => {
                const cfg = TYPE_CONFIG[n.type] ?? { emoji: '🔔', accent: C.primary, bg: C.surfaceLow };
                return (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'flex-start',
                      background: n.read ? C.surface : cfg.bg,
                      border: `1px solid ${n.read ? '#dae2fd' : cfg.accent}22`,
                      borderLeft: `3px solid ${n.read ? '#dae2fd' : cfg.accent}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{cfg.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, color: C.text }}>{n.message.split('·')[0].trim()}</div>
                      {n.message.includes('·') && (
                        <div style={{ fontSize: 13, color: C.textSec }}>{n.message.split('·').slice(1).join('·').trim()}</div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        {!n.read && (
                          <button onClick={() => markRead(n.id)} style={{ fontSize: 12, color: cfg.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.sans, padding: 0, fontWeight: 700 }}>
                            Mark read
                          </button>
                        )}
                        {(n.type === 'submission_approved' || n.type === 'submission_rejected') && onNavigate && (
                          <button onClick={() => onNavigate('challenges')} style={{ fontSize: 12, color: C.primary, background: '#eaedff', border: 'none', borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontFamily: C.sans, fontWeight: 700 }}>
                            View challenges →
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2, fontFamily: C.mono }}>{timeAgo(n.created_at)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
