import { useState, useEffect } from 'react';
import { getProfile } from '../api/client';
import type { Badge } from '../types';

const BADGE_META: Record<string, { emoji: string; label: string }> = {
  speed_runner: { emoji: '⚡', label: 'Speed Runner' },
  streak_3: { emoji: '🔥', label: '3-Week Streak' },
  first_submit: { emoji: '🎯', label: 'First Submit' },
  top_3: { emoji: '🏆', label: 'Top 3' },
  centurion: { emoji: '💯', label: 'Centurion' },
};

interface ProfileData {
  user: { id: string; name: string; email: string; team: string; role: string; points: number };
  submissions: Array<{ id: string; status: string; created_at: string; challenge?: { title: string; points: number } }>;
  badges: Badge[];
  rank: number;
}

function statusIcon(s: string) { return s === 'approved' ? '✅' : s === 'rejected' ? '❌' : '🔄'; }

export default function Profile() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>Loading…</div>;
  if (!data) return null;

  const { user, submissions, badges, rank } = data;
  const initials = user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header card */}
      <div style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 16, padding: 28, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#1f8a5b', color: '#fff', fontWeight: 800, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{user.name}</h2>
          <div style={{ fontSize: 14, color: '#69748c', marginBottom: 12 }}>{user.team} · {user.role === 'admin' ? 'Admin' : 'Employee'}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { val: user.points.toLocaleString(), label: 'Points' },
              { val: submissions.filter(s => s.status === 'approved').length, label: 'Completed' },
              { val: rank > 0 ? `#${rank}` : '—', label: 'Rank' },
            ].map((stat, i, arr) => (
              <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#1a00d9' }}>{stat.val}</div>
                  <div style={{ fontSize: 11, color: '#9aa3b5' }}>{stat.label}</div>
                </div>
                {i < arr.length - 1 && <div style={{ width: 1, height: 36, background: '#e7edf8' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 16, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Badges earned</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {badges.map(b => {
              const meta = BADGE_META[b.badge_type] ?? { emoji: '⭐', label: b.badge_type };
              return (
                <div key={b.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: '#f6f8fc', borderRadius: 12, padding: '16px 20px' }}>
                  <span style={{ fontSize: 28 }}>{meta.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#69748c' }}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 16, padding: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Recent activity</h3>
        {submissions.length === 0 && <p style={{ color: '#9aa3b5', fontSize: 14 }}>No submissions yet. Pick a challenge to get started!</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {submissions.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f6f8fc', borderRadius: 10 }}>
              <span style={{ fontSize: 20 }}>{statusIcon(s.status)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {s.status === 'approved' ? 'Completed' : s.status === 'rejected' ? 'Rejected' : 'In progress'}: {s.challenge?.title ?? 'Unknown challenge'}
                </div>
                <div style={{ fontSize: 12, color: '#9aa3b5' }}>
                  {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {s.status === 'approved' && s.challenge?.points ? ` · +${s.challenge.points} pts` : s.challenge?.points ? ` · ${s.challenge.points} pts available` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
