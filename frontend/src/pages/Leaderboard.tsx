import { useState, useEffect } from 'react';
import { getLeaderboard } from '../api/client';
import type { LeaderboardEntry } from '../types';

const PODIUM_STYLES = [
  { emoji: '🥇', gradient: 'linear-gradient(135deg,#ffe066,#fe6e06)' },
  { emoji: '🥈', gradient: 'linear-gradient(135deg,#c0c8d8,#8a96aa)' },
  { emoji: '🥉', gradient: 'linear-gradient(135deg,#e8a87c,#c07040)' },
];

const RANK_COLORS: Record<number, string> = { 1: '#fe6e06', 2: '#2a6fdb', 3: '#c07040' };

type Period = 'all' | 'month';

interface Props { currentUserId: string; }

export default function Leaderboard({ currentUserId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');

  useEffect(() => {
    setLoading(true);
    setEntries([]);
    getLeaderboard(period).then(setEntries).finally(() => setLoading(false));
  }, [period]);

  const toggleBtn = (p: Period): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer', border: 'none',
    background: period === p ? '#1a00d9' : '#f0f3fa',
    color: period === p ? '#fff' : '#69748c',
  });

  function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const ptsLabel = period === 'month' ? 'pts this month' : 'pts all-time';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setPeriod('all')} style={toggleBtn('all')}>All-time</button>
        <button onClick={() => setPeriod('month')} style={toggleBtn('month')}>This month</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>
          {period === 'month' ? 'No approved submissions this month yet.' : 'No entries yet.'}
        </div>
      ) : (
        <>
          {/* Podium */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${top3.length}, 1fr)`, gap: 16, marginBottom: 28 }}>
            {top3.map((e, i) => (
              <div key={e.user_id} style={{ background: PODIUM_STYLES[i].gradient, borderRadius: 16, padding: 22, color: '#fff', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>{PODIUM_STYLES[i].emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{e.name}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{e.team}</div>
                <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{e.points.toLocaleString()}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{ptsLabel}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 100px', padding: '12px 20px', background: '#f6f8fc', borderBottom: '1px solid #e7edf8', fontSize: 11, fontWeight: 700, color: '#9aa3b5', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              <span>#</span><span>Employee</span><span style={{ textAlign: 'right' }}>Completed</span><span style={{ textAlign: 'right' }}>Points</span>
            </div>
            {entries.map(e => {
              const isMe = e.user_id === currentUserId;
              return (
                <div key={e.user_id} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 100px', padding: '14px 20px', borderBottom: '1px solid #f0f3fa', alignItems: 'center', background: isMe ? '#f0f5ff' : undefined }}>
                  <span style={{ fontWeight: 700, color: RANK_COLORS[e.rank] ?? '#9aa3b5' }}>{e.rank}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a00d9', color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(e.name)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name}{isMe ? ' (you)' : ''}</div>
                      <div style={{ fontSize: 11, color: '#9aa3b5' }}>{e.team}</div>
                    </div>
                  </div>
                  <span style={{ textAlign: 'right', fontSize: 13, color: '#69748c' }}>{e.challenge_count}</span>
                  <span style={{ textAlign: 'right', fontWeight: 800, color: '#1a00d9' }}>{e.points.toLocaleString()}</span>
                </div>
              );
            })}
            {rest.length === 0 && entries.length <= 3 && (
              <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 20, fontSize: 13 }}>Only the top {entries.length} {period === 'month' ? 'contributors this month' : 'contributors'} so far.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
