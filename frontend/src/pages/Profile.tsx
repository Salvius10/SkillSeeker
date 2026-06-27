import { useState, useEffect } from 'react';
import { Flame, Trophy, CheckCircle2, Target, TrendingUp, Clock } from 'lucide-react';
import { getProfile } from '../api/client';
import type { Badge } from '../types';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
  bg: '#faf8ff',
  surface: '#ffffff',
  surfaceLow: '#f2f3ff',
  border: '#dae2fd',
  text: '#131b2e',
  textSec: '#454556',
  textMuted: '#545567',
  success: '#10b981',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const BADGE_META: Record<string, { emoji: string; label: string; desc: string }> = {
  speed_runner: { emoji: '⚡', label: 'Speed Runner', desc: 'Submitted within 24h of a challenge going live' },
  streak_3:     { emoji: '🔥', label: '3-Week Streak', desc: 'Submitted every week for 3 consecutive weeks' },
  first_submit: { emoji: '🎯', label: 'First Submit',  desc: 'Completed your first challenge' },
  top_3:        { emoji: '🏆', label: 'Top 3',          desc: 'Ranked in the top 3 on the leaderboard' },
  centurion:    { emoji: '💯', label: 'Centurion',      desc: 'Earned 100+ points' },
};

const ALL_BADGE_TYPES = Object.keys(BADGE_META);

const TIERS = [
  { label: 'Bronze',   pts: 0 },
  { label: 'Silver',   pts: 250 },
  { label: 'Gold',     pts: 750 },
  { label: 'Platinum', pts: 2000 },
  { label: 'Elite',    pts: 5000 },
];

function getTier(points: number) {
  const idx = [...TIERS].reverse().findIndex(t => points >= t.pts);
  const tier = idx >= 0 ? TIERS[TIERS.length - 1 - idx] : TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];
  return { tier, nextTier };
}

interface SubmissionItem {
  id: string;
  status: string;
  created_at: string;
  challenge?: { title: string; points: number; category?: string };
}

interface ProfileData {
  user: { id: string; name: string; email: string; team: string; role: string; points: number };
  submissions: SubmissionItem[];
  badges: Badge[];
  rank: number;
  total_employees?: number;
}

function statusColor(s: string) {
  if (s === 'approved') return C.success;
  if (s === 'rejected') return '#d32f2f';
  return C.orange;
}

function calcStreak(submissions: SubmissionItem[]): number {
  const weeks = new Set<string>();
  for (const s of submissions) {
    const d = new Date(s.created_at);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - day);
    const y = d.getFullYear();
    const w = Math.ceil(((d.getTime() - new Date(y, 0, 1).getTime()) / 86400000 + 1) / 7);
    weeks.add(`${y}-${w}`);
  }
  let streak = 0;
  const now = new Date();
  const refDay = now.getDay() || 7;
  now.setDate(now.getDate() + 4 - refDay);
  const curY = now.getFullYear();
  const curW = Math.ceil(((now.getTime() - new Date(curY, 0, 1).getTime()) / 86400000 + 1) / 7);
  let y = curY, w = curW;
  while (weeks.has(`${y}-${w}`)) { streak++; w--; if (w < 1) { y--; w = 52; } }
  return streak;
}

const card: React.CSSProperties = { background: C.surface, border: '1px solid #dae2fd', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(26,0,217,0.04)' };

export default function Profile() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>
      <div style={{ width: 36, height: 36, border: `3px solid #dae2fd`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
    </div>
  );
  if (!data) return null;

  const { user, submissions, badges, rank, total_employees } = data;
  const initials = user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const approved = submissions.filter(s => s.status === 'approved');
  const approvalPct = submissions.length > 0 ? Math.round((approved.length / submissions.length) * 100) : 0;
  const streak = calcStreak(submissions);
  const earnedTypes = new Set(badges.map(b => b.badge_type));

  const { tier, nextTier } = getTier(user.points);
  const tierProgress = nextTier
    ? Math.min(((user.points - tier.pts) / (nextTier.pts - tier.pts)) * 100, 100)
    : 100;
  const ptsToNext = nextTier ? nextTier.pts - user.points : 0;

  const catMap: Record<string, number> = {};
  for (const s of approved) {
    if (s.challenge?.category) catMap[s.challenge.category] = (catMap[s.challenge.category] ?? 0) + 1;
  }
  const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...categories.map(c => c[1]), 1);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.2s ease' }}>

      {/* Profile hero */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {/* Top gradient strip */}
        <div style={{ height: 6, background: 'linear-gradient(90deg, #0f0099, #1a00d9, #fe6e06)' }} />
        <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg, #1a00d9, #413ff4)', color: '#fff', fontWeight: 800, fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(26,0,217,0.25)' }}>{initials}</div>
            <div style={{ position: 'absolute', bottom: -2, right: -2, background: C.orange, borderRadius: 20, padding: '2px 6px', fontSize: 9.5, fontWeight: 800, color: '#fff', fontFamily: C.mono, border: `2px solid ${C.surface}` }}>{tier.label.toUpperCase()}</div>
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.4px' }}>{user.name}</h2>
            <div style={{ fontSize: 13.5, color: C.textSec, marginBottom: 16 }}>{user.team} · {user.role === 'admin' ? 'Admin' : 'Employee'}</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { val: user.points.toLocaleString(), label: 'Total Points', color: C.primary },
                { val: approved.length, label: 'Completed', color: C.success },
                { val: rank > 0 ? `#${rank}` : '—', label: total_employees ? `of ${total_employees}` : 'Rank', color: C.orange },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: C.mono }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{s.label}</div>
                  </div>
                  {i < arr.length - 1 && <div style={{ width: 1, height: 32, background: '#dae2fd' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { icon: <Target size={20} color={C.primary} />, val: submissions.length, label: 'Submissions', sub: 'total', color: C.primary },
          { icon: <CheckCircle2 size={20} color={C.success} />, val: `${approvalPct}%`, label: 'Approval Rate', sub: 'of submitted', color: C.success },
          { icon: <Flame size={20} color={C.orange} />, val: streak > 0 ? `${streak}w` : '—', label: 'Streak', sub: 'consecutive weeks', color: C.orange },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color, fontFamily: C.mono }}>{s.val}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{s.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tier progress */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
              {tier.label} Tier
              {nextTier && <span style={{ fontSize: 13, fontWeight: 500, color: C.textMuted, marginLeft: 8 }}>→ {nextTier.label}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {nextTier ? (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.orange, fontFamily: C.mono }}>{ptsToNext.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>pts to {nextTier.label}</div>
              </>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 700, color: C.success }}>Max Tier!</div>
            )}
          </div>
        </div>
        <div style={{ height: 10, background: '#f2f3ff', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '100%', background: `linear-gradient(90deg, ${C.primary} 0%, #5e9eff 100%)`, borderRadius: 6, transformOrigin: 'left', transform: `scaleX(${tierProgress / 100})`, transition: 'transform 0.6s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, color: C.textMuted, fontFamily: C.mono }}>
          <span>{tier.pts.toLocaleString()} pts</span>
          <span style={{ fontWeight: 700, color: C.primary }}>{user.points.toLocaleString()} pts</span>
          <span>{nextTier ? `${nextTier.pts.toLocaleString()} pts` : '—'}</span>
        </div>
      </div>

      {/* Badges */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Badges</h3>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSec, fontFamily: C.mono }}>
            {badges.length} / {ALL_BADGE_TYPES.length} <span style={{ fontWeight: 500, color: C.textMuted }}>earned</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ALL_BADGE_TYPES.map(type => {
            const meta = BADGE_META[type];
            const earned = earnedTypes.has(type);
            return (
              <div
                key={type}
                title={meta.desc}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  background: earned ? 'linear-gradient(135deg, #f2f3ff 0%, #eaedff 100%)' : '#fafafa',
                  borderRadius: 14,
                  padding: '16px 20px',
                  opacity: earned ? 1 : 0.4,
                  border: `1px solid ${earned ? '#c6c4d9' : '#f2f3ff'}`,
                  cursor: earned ? 'default' : 'not-allowed',
                  minWidth: 88,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 32 }}>{meta.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: earned ? C.textSec : C.textMuted, textAlign: 'center' }}>{meta.label}</span>
                {!earned && <span style={{ fontSize: 10, color: C.textMuted, fontFamily: C.mono }}>LOCKED</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills breakdown */}
      {categories.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: C.text }}>Skills Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categories.map(([cat, count]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 100, fontSize: 12.5, color: C.textSec, textAlign: 'right', flexShrink: 0 }}>{cat}</span>
                <div style={{ flex: 1, height: 12, background: '#f2f3ff', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', background: `linear-gradient(90deg, ${C.primary} 0%, #413ff4 100%)`, borderRadius: 6, transformOrigin: 'left', transform: `scaleX(${count / maxCat})`, transition: 'transform 0.6s ease' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, width: 28, textAlign: 'right', flexShrink: 0, fontFamily: C.mono }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity timeline */}
      <div style={card}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>Activity Timeline</h3>
        {submissions.length === 0 ? (
          <div style={{ color: C.textMuted, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No submissions yet. Pick a challenge to get started!</div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: 12, bottom: 12, width: 2, background: '#dae2fd', borderRadius: 2 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {submissions.map(s => {
                const color = statusColor(s.status);
                const label = s.status === 'approved' ? 'Approved' : s.status === 'rejected' ? 'Revision Requested' : 'In Review';
                return (
                  <div key={s.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingLeft: 40, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 7, top: 12, width: 16, height: 16, borderRadius: '50%', background: color, border: `2px solid ${C.surface}`, boxShadow: `0 0 0 2px ${color}40` }} />
                    <div style={{ flex: 1, background: C.surfaceLow, border: '1px solid #dae2fd', borderRadius: 12, padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {s.status === 'approved' && <TrendingUp size={13} color={C.success} />}
                          {s.status === 'pending' && <Clock size={13} color={C.orange} />}
                          <span style={{ fontWeight: 700, fontSize: 12.5, color }}>{label}</span>
                        </div>
                        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: C.mono }}>{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.textSec }}>{s.challenge?.title ?? 'Unknown challenge'}</div>
                      {s.status === 'approved' && s.challenge?.points && (
                        <div style={{ fontSize: 12.5, color: C.success, marginTop: 4, fontWeight: 700, fontFamily: C.mono }}>+{s.challenge.points} pts</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
