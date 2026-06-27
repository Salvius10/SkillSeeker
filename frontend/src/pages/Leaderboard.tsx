import { useState, useEffect } from 'react';
import { Crown, Medal } from 'lucide-react';
import { getLeaderboard } from '../api/client';
import type { LeaderboardEntry } from '../types';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
  bg: '#faf8ff',
  surface: '#ffffff',
  border: '#dae2fd',
  text: '#131b2e',
  textSec: '#454556',
  textMuted: '#545567',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const PODIUM = [
  { gradient: 'linear-gradient(135deg, #fe6e06 0%, #ff9a4a 100%)', shadow: '0 8px 24px rgba(254,110,6,0.3)', label: '1ST', icon: <Crown size={20} fill="#fff" color="#fff" /> },
  { gradient: 'linear-gradient(135deg, #454556 0%, #767588 100%)', shadow: '0 8px 24px rgba(69,69,86,0.25)', label: '2ND', icon: <Medal size={18} color="#fff" /> },
  { gradient: 'linear-gradient(135deg, #c07040 0%, #e8a87c 100%)', shadow: '0 8px 24px rgba(192,112,64,0.25)', label: '3RD', icon: <Medal size={18} color="#fff" /> },
];

const RANK_ACCENT: Record<number, string> = { 1: C.orange, 2: '#767588', 3: '#c07040' };

type Period = 'all' | 'month';
interface Props { currentUserId: string; }

function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

export default function Leaderboard({ currentUserId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');

  useEffect(() => {
    setLoading(true);
    setEntries([]);
    getLeaderboard(period).then(setEntries).finally(() => setLoading(false));
  }, [period]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const ptsLabel = period === 'month' ? 'pts this month' : 'pts all-time';

  const pillBtn = (p: Period): React.CSSProperties => ({
    padding: '8px 20px',
    borderRadius: 24,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: C.sans,
    cursor: 'pointer',
    border: 'none',
    background: period === p ? C.primary : C.surface,
    color: period === p ? '#fff' : C.textSec,
    boxShadow: period === p ? '0 2px 8px rgba(26,0,217,0.2)' : 'none',
    outline: period !== p ? '1px solid #dae2fd' : 'none',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', animation: 'fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-0.4px' }}>
            {entries.length > 0 ? `Top ${entries.length} Contributors` : 'Leaderboard'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 6, background: C.surface, border: '1px solid #dae2fd', borderRadius: 28, padding: 4 }}>
          <button onClick={() => setPeriod('all')} style={pillBtn('all')}>All-time</button>
          <button onClick={() => setPeriod('month')} style={pillBtn('month')}>This month</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>
          <div style={{ width: 36, height: 36, border: `3px solid #dae2fd`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, background: C.surface, border: '1px solid #dae2fd', borderRadius: 16 }}>
          {period === 'month' ? 'No approved submissions this month yet.' : 'No entries yet.'}
        </div>
      ) : (
        <>
          {/* Podium cards */}
          {top3.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${top3.length}, 1fr)`, gap: 14, marginBottom: 24 }}>
              {top3.map((e, i) => {
                const p = PODIUM[i];
                const isMe = e.user_id === currentUserId;
                return (
                  <div key={e.user_id} style={{ background: p.gradient, borderRadius: 16, padding: '24px 20px', color: '#fff', textAlign: 'center', boxShadow: p.shadow, position: 'relative', overflow: 'hidden', animation: 'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1)', animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
                    {isMe && (
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: C.mono }}>YOU</div>
                    )}
                    <div style={{ marginBottom: 8 }}>{p.icon}</div>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>{initials(e.name)}</div>
                    <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.2px' }}>{e.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>{e.team}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, fontFamily: C.mono }}>{e.points.toLocaleString()}</div>
                    <div style={{ fontSize: 11, opacity: 0.75, fontFamily: C.mono }}>{ptsLabel}</div>
                    <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', opacity: 0.6, fontFamily: C.mono }}>{p.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rest of the table */}
          {(rest.length > 0 || entries.length > 0) && (
            <div style={{ background: C.surface, border: '1px solid #dae2fd', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(26,0,217,0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 90px 100px', padding: '12px 20px', background: '#f2f3ff', borderBottom: '1px solid #dae2fd', fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: C.mono }}>
                <span>#</span><span>Employee</span><span style={{ textAlign: 'right' }}>Done</span><span style={{ textAlign: 'right' }}>Points</span>
              </div>
              {entries.map((e, idx) => {
                const isMe = e.user_id === currentUserId;
                const rankColor = RANK_ACCENT[e.rank];
                return (
                  <div
                    key={e.user_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '52px 1fr 90px 100px',
                      padding: '13px 20px',
                      borderBottom: idx < entries.length - 1 ? '1px solid #f2f3ff' : 'none',
                      alignItems: 'center',
                      background: isMe ? 'linear-gradient(90deg, rgba(26,0,217,0.04) 0%, rgba(26,0,217,0.02) 100%)' : undefined,
                    }}
                  >
                    <span style={{ fontWeight: 800, fontFamily: C.mono, fontSize: 14, color: rankColor ?? C.textMuted }}>{e.rank}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: rankColor ? `linear-gradient(135deg, ${rankColor}, ${rankColor}aa)` : 'linear-gradient(135deg, #1a00d9, #413ff4)', color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(e.name)}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{e.name}{isMe ? <span style={{ fontFamily: C.mono, fontSize: 10, color: C.primary, background: '#eaedff', padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>you</span> : ''}</div>
                        <div style={{ fontSize: 11.5, color: C.textMuted }}>{e.team}</div>
                      </div>
                    </div>
                    <span style={{ textAlign: 'right', fontSize: 13, color: C.textSec, fontFamily: C.mono }}>{e.challenge_count}</span>
                    <span style={{ textAlign: 'right', fontWeight: 800, color: C.primary, fontSize: 14, fontFamily: C.mono }}>{e.points.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
