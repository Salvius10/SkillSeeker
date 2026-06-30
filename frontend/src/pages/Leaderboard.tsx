import { useState, useEffect } from 'react';
import { Crown, Medal } from 'lucide-react';
import { getLeaderboard } from '../api/client';
import type { LeaderboardEntry } from '../types';
import { useAuth } from '../context/AuthContext';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
  surface: '#ffffff',
  border: 'rgba(26,0,217,0.08)',
  text: '#0e1523',
  textSec: '#3d4460',
  textMuted: '#8891a8',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const PODIUM = [
  {
    gradient: 'linear-gradient(145deg, #e85c00 0%, #fe6e06 50%, #ff9640 100%)',
    shadow: '0 12px 36px rgba(254,110,6,0.35)',
    label: '1ST',
    icon: <Crown size={22} fill="#fff" color="#fff" />,
  },
  {
    gradient: 'linear-gradient(145deg, #2d2d3e 0%, #454556 50%, #6a6a80 100%)',
    shadow: '0 12px 36px rgba(69,69,86,0.3)',
    label: '2ND',
    icon: <Medal size={20} color="#fff" />,
  },
  {
    gradient: 'linear-gradient(145deg, #a05a2c 0%, #c07040 50%, #e0986a 100%)',
    shadow: '0 12px 36px rgba(192,112,64,0.3)',
    label: '3RD',
    icon: <Medal size={20} color="#fff" />,
  },
];

const RANK_ACCENT: Record<number, string> = { 1: C.orange, 2: '#767588', 3: '#c07040' };

type Period = 'all' | 'month';
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

export default function Leaderboard() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    setLoading(true);
    setEntries([]);
    setFetchError('');
    getLeaderboard(period)
      .then(setEntries)
      .catch(() => setFetchError('Failed to load leaderboard. Please refresh.'))
      .finally(() => setLoading(false));
  }, [period]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const ptsLabel = period === 'month' ? 'this month' : 'all-time';

  const pillBtn = (p: Period): React.CSSProperties => ({
    padding: '7px 18px', borderRadius: 20, fontSize: 12.5,
    fontWeight: 600, fontFamily: C.sans, cursor: 'pointer', border: 'none',
    background: period === p ? C.primary : 'transparent',
    color: period === p ? '#fff' : C.textSec,
    boxShadow: period === p ? '0 2px 10px rgba(26,0,217,0.25)' : 'none',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', animation: 'fadeIn 0.35s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.5px' }}>
            {entries.length > 0 ? `Top ${entries.length} Contributors` : 'Leaderboard'}
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: C.textMuted, fontWeight: 500 }}>Points earned {ptsLabel}</p>
        </div>
        <div style={{
          display: 'flex', gap: 3,
          background: C.surface, border: '1px solid rgba(26,0,217,0.09)',
          borderRadius: 24, padding: 4,
          boxShadow: '0 1px 4px rgba(26,0,217,0.05)',
        }}>
          <button onClick={() => setPeriod('all')} style={pillBtn('all')}>All-time</button>
          <button onClick={() => setPeriod('month')} style={pillBtn('month')}>This month</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.textMuted, padding: 80 }}>
          <div style={{ width: 30, height: 30, border: '2.5px solid rgba(26,0,217,0.1)', borderTop: `2.5px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
        </div>
      ) : fetchError ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 14, color: '#d32f2f', background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 12, padding: '12px 20px', display: 'inline-block' }}>{fetchError}</div>
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, background: C.surface, border: '1px solid rgba(26,0,217,0.07)', borderRadius: 16, boxShadow: '0 2px 12px rgba(26,0,217,0.04)' }}>
          {period === 'month' ? 'No approved submissions this month yet.' : 'No entries yet.'}
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${top3.length}, 1fr)`, gap: 14, marginBottom: 18 }}>
              {top3.map((e, i) => {
                const p = PODIUM[i];
                const isMe = e.user_id === currentUserId;
                return (
                  <div key={e.user_id} style={{
                    background: p.gradient,
                    borderRadius: 18, padding: '28px 20px 24px',
                    color: '#fff', textAlign: 'center',
                    boxShadow: p.shadow,
                    position: 'relative', overflow: 'hidden',
                    animation: 'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1)',
                    animationDelay: `${i * 70}ms`, animationFillMode: 'both',
                  }}>
                    {/* Shine */}
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(255,255,255,0.14) 0%, transparent 60%)', pointerEvents: 'none' }} />

                    {isMe && (
                      <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.22)', borderRadius: 20, padding: '2px 9px', fontSize: 9.5, fontWeight: 700, fontFamily: C.mono, letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.3)' }}>YOU</div>
                    )}
                    <div style={{ marginBottom: 10, opacity: 0.95 }}>{p.icon}</div>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.18)',
                      border: '2px solid rgba(255,255,255,0.35)',
                      color: '#fff', fontWeight: 800, fontSize: 17,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    }}>{initials(e.name)}</div>
                    <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px', marginBottom: 2 }}>{e.name}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.7, marginBottom: 14, fontWeight: 500 }}>{e.team}</div>
                    <div style={{ fontSize: 30, fontWeight: 900, fontFamily: C.mono, letterSpacing: '-1px', lineHeight: 1 }}>{e.points.toLocaleString()}</div>
                    <div style={{ fontSize: 10.5, opacity: 0.65, fontFamily: C.mono, marginTop: 4, letterSpacing: '0.04em' }}>pts {ptsLabel}</div>
                    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', opacity: 0.45, fontFamily: C.mono }}>{p.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table — ranks 4 and below */}
          {rest.length > 0 && (
            <div style={{
              background: C.surface,
              border: '1px solid rgba(26,0,217,0.07)',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(26,0,217,0.05)',
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '52px 1fr 80px 110px',
                padding: '11px 22px',
                background: 'linear-gradient(180deg, #f4f5ff 0%, #f8f9ff 100%)',
                borderBottom: '1px solid rgba(26,0,217,0.07)',
                fontSize: 10.5, fontWeight: 700, color: C.textMuted,
                letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: C.mono,
              }}>
                <span>#</span><span>Employee</span><span style={{ textAlign: 'right' }}>Done</span><span style={{ textAlign: 'right' }}>Points</span>
              </div>
              {rest.map((e, idx) => {
                const isMe = e.user_id === currentUserId;
                const rankColor = RANK_ACCENT[e.rank];
                return (
                  <div
                    key={e.user_id}
                    style={{
                      display: 'grid', gridTemplateColumns: '52px 1fr 80px 110px',
                      padding: '13px 22px',
                      borderBottom: idx < rest.length - 1 ? '1px solid rgba(26,0,217,0.05)' : 'none',
                      alignItems: 'center',
                      background: isMe
                        ? 'linear-gradient(90deg, rgba(26,0,217,0.04) 0%, rgba(26,0,217,0.02) 50%, transparent 100%)'
                        : undefined,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e2 => { if (!isMe) (e2.currentTarget as HTMLDivElement).style.background = 'rgba(26,0,217,0.02)'; }}
                    onMouseLeave={e2 => { if (!isMe) (e2.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <span style={{ fontWeight: 800, fontFamily: C.mono, fontSize: 14, color: rankColor ?? C.textMuted }}>{e.rank}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: rankColor
                          ? `linear-gradient(135deg, ${rankColor}cc, ${rankColor}66)`
                          : 'linear-gradient(135deg, #1a00d9, #413ff4)',
                        color: '#fff', fontWeight: 700, fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, boxShadow: rankColor ? `0 2px 8px ${rankColor}44` : '0 2px 8px rgba(26,0,217,0.2)',
                      }}>{initials(e.name)}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text, letterSpacing: '-0.1px' }}>
                          {e.name}
                          {isMe && <span style={{ fontFamily: C.mono, fontSize: 9.5, color: C.primary, background: '#eaedff', padding: '1px 7px', borderRadius: 10, marginLeft: 7, fontWeight: 700 }}>you</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 1 }}>{e.team}</div>
                      </div>
                    </div>
                    <span style={{ textAlign: 'right', fontSize: 13, color: C.textSec, fontFamily: C.mono }}>{e.challenge_count}</span>
                    <span style={{ textAlign: 'right', fontWeight: 800, color: C.primary, fontSize: 14.5, fontFamily: C.mono }}>{e.points.toLocaleString()}</span>
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
