import { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle2, AlertCircle, TrendingUp, Target } from 'lucide-react';
import { getAnalytics } from '../../api/client';
import type { AnalyticsData } from '../../types';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
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

const RANK_COLORS: Record<number, string> = { 0: C.orange, 1: '#767588', 2: '#c07040' };

const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 4px 12px rgba(26,0,217,0.04)',
};

function WeekLabel({ week }: { week: string }) {
  const m = week.match(/(\d{4})-W(\d+)/);
  return <span>{m ? `W${m[2]}` : week}</span>;
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
    </div>
  );
  if (!data) return null;

  const maxTeamPts = Math.max(...data.team_stats.map(t => t.total_points), 1);
  const maxWeekCount = Math.max(...data.submissions_by_week.map(w => w.count), 1);
  const maxCatPts = Math.max(...data.points_by_category.map(c => c.points), 1);
  const maxChalCount = Math.max(...data.top_challenges.map(c => c.count), 1);

  const totalDecided = data.approved_count + data.rejected_count;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* ── Hero KPIs ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>

        {/* Participation */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={20} color={C.primary} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>Participation</span>
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: C.primary, fontFamily: C.mono, lineHeight: 1, letterSpacing: '-1px' }}>
              {data.participation_rate}<span style={{ fontSize: 22, fontWeight: 700 }}>%</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6 }}>of employees have submitted at least once</div>
          </div>
        </div>

        {/* Pending Review */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: data.pending_count > 0 ? 'rgba(211,47,47,0.08)' : 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={20} color={data.pending_count > 0 ? '#d32f2f' : C.success} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>Pending Review</span>
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: data.pending_count > 0 ? '#d32f2f' : C.success, fontFamily: C.mono, lineHeight: 1, letterSpacing: '-1px' }}>
              {data.pending_count}
            </div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6 }}>
              {data.pending_count > 0 ? 'submissions awaiting your review' : 'all submissions reviewed — nice work!'}
            </div>
          </div>
        </div>

        {/* Approval Rate + secondary strip */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${data.approval_rate >= 70 ? C.success : C.orange}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={20} color={data.approval_rate >= 70 ? C.success : C.orange} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>Approval Rate</span>
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: data.approval_rate >= 70 ? C.success : C.orange, fontFamily: C.mono, lineHeight: 1, letterSpacing: '-1px' }}>
              {data.approval_rate}<span style={{ fontSize: 22, fontWeight: 700 }}>%</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6 }}>
              {data.approved_count} approved · {data.rejected_count} revised · {totalDecided} decided
            </div>
          </div>
          {/* Secondary metrics strip */}
          <div style={{ display: 'flex', borderTop: `1px solid ${C.border}` }}>
            {[
              { label: 'Total submissions', val: data.total_submissions, color: C.primary },
              { label: 'Avg review time', val: `${data.avg_review_days}d`, color: '#413ff4' },
              { label: 'Open challenges', val: data.open_challenges, color: C.success },
            ].map((k, i, arr) => (
              <div key={k.label} style={{ flex: 1, padding: '12px 14px', borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: k.color, fontFamily: C.mono, lineHeight: 1 }}>{k.val}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Challenge overview ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Points Pool', sub: 'available in open challenges', val: `${data.total_points_pool.toLocaleString()} pts`, color: C.orange, icon: <Target size={18} color={C.orange} /> },
          { label: 'Points Awarded', sub: 'distributed to employees', val: data.total_points_awarded.toLocaleString(), color: C.primary, icon: <TrendingUp size={18} color={C.primary} /> },
          { label: 'Open Challenges', sub: 'accepting submissions now', val: String(data.open_challenges), color: C.success, icon: <CheckCircle2 size={18} color={C.success} /> },
          { label: 'Avg Review Time', sub: 'days from submit to decision', val: `${data.avg_review_days}d`, color: '#413ff4', icon: <Clock size={18} color="#413ff4" /> },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: C.mono, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Top Performers + Submission Trend ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: data.submissions_by_week.length > 0 ? '1.1fr 0.9fr' : '1fr', gap: 14 }}>

        {/* Top Performers */}
        {data.top_employees.length > 0 && (
          <div style={card}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>Top Performers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 68px 64px', gap: 10, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: C.mono, padding: '0 6px 10px', borderBottom: `1px solid ${C.border}` }}>
                <span>#</span><span>Employee</span><span>Team</span><span style={{ textAlign: 'right' }}>Points</span><span style={{ textAlign: 'right' }}>Done</span>
              </div>
              {data.top_employees.map((e, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 68px 64px', gap: 10, alignItems: 'center', padding: '9px 6px', borderRadius: 8, background: i === 0 ? `${C.orange}08` : undefined }}>
                  <span style={{ fontWeight: 900, fontSize: 14, color: RANK_COLORS[i] ?? C.textMuted, fontFamily: C.mono }}>#{i + 1}</span>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{e.name}</span>
                  <span style={{ fontSize: 11.5, color: C.textSec, background: C.surfaceLow, borderRadius: 20, padding: '2px 8px', display: 'inline-block', fontFamily: C.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.team}</span>
                  <span style={{ fontWeight: 800, fontSize: 13, color: C.primary, textAlign: 'right', fontFamily: C.mono }}>{e.points.toLocaleString()}</span>
                  <span style={{ fontSize: 12.5, color: C.success, textAlign: 'right', fontWeight: 700, fontFamily: C.mono }}>{e.completions}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submission Trend */}
        {data.submissions_by_week.length > 0 && (
          <div style={card}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>Submission Activity</h3>
            <div
              role="img"
              aria-label={`Submission activity over the last ${data.submissions_by_week.length} weeks. Peak: ${maxWeekCount}.`}
              style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, paddingBottom: 28, position: 'relative' }}
            >
              {data.submissions_by_week.map((w, wi) => (
                <div key={w.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, fontFamily: C.mono }}>{w.count}</span>
                  <div style={{ width: '70%', background: C.surfaceLow, borderRadius: '4px 4px 0 0', height: `${Math.max((w.count / maxWeekCount) * 100, 4)}%`, overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: `linear-gradient(180deg, ${C.primary} 0%, #413ff4 100%)`, transformOrigin: 'bottom', transform: 'scaleY(1)', borderRadius: '4px 4px 0 0', animation: 'barFillV 0.6s cubic-bezier(0.16,1,0.3,1)', animationDelay: `${wi * 60}ms`, animationFillMode: 'both' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: 4, fontSize: 9, color: C.textMuted, fontFamily: C.mono }}>
                    <WeekLabel week={w.week} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Team Performance ──────────────────────────────────────── */}
      {data.team_stats.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>Team Performance</h3>
          <div role="img" aria-label="Team performance bar chart by total points" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {data.team_stats.map((t, i) => (
              <div key={t.team} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 80px 70px', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.team}</span>
                <div style={{ height: 16, background: C.surfaceLow, borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(t.total_points / maxTeamPts) * 100}%`,
                    background: i === 0 ? `linear-gradient(90deg, ${C.primary}, #413ff4)` : i === 1 ? 'linear-gradient(90deg, #5e9eff, #7ab8ff)' : `linear-gradient(90deg, ${C.orange}, #ff8c38)`,
                    borderRadius: 5,
                    transformOrigin: 'left',
                    transform: 'scaleX(1)',
                    animation: 'barFill 0.6s cubic-bezier(0.16,1,0.3,1)',
                    animationDelay: `${i * 80}ms`,
                    animationFillMode: 'both',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: C.textMuted, textAlign: 'right', fontFamily: C.mono }}>{t.member_count} members</span>
                <span style={{ fontSize: 13, fontWeight: 800, textAlign: 'right', fontFamily: C.mono, color: i === 0 ? C.primary : C.textSec }}>{t.total_points.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Challenge Engagement + Points by Category ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: data.top_challenges.length > 0 && data.points_by_category.length > 0 ? '1fr 1fr' : '1fr', gap: 14 }}>

        {/* Top challenges by submissions */}
        {data.top_challenges.length > 0 && (
          <div style={card}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>Challenge Engagement</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', fontSize: 10.5, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: C.mono, marginBottom: 4 }}>
                <span>Challenge</span><span style={{ textAlign: 'right' }}>Submissions</span>
              </div>
              {data.top_challenges.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12.5, color: C.textSec, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }} title={c.title}>{c.title}</span>
                  <div style={{ width: 90, height: 14, background: C.surfaceLow, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{
                      height: '100%',
                      width: `${(c.count / maxChalCount) * 100}%`,
                      background: i === 0 ? `linear-gradient(90deg, ${C.orange}, #ff8c38)` : `linear-gradient(90deg, ${C.primary}, #413ff4)`,
                      borderRadius: 4,
                      transformOrigin: 'left',
                      transform: 'scaleX(1)',
                      animation: 'barFill 0.6s cubic-bezier(0.16,1,0.3,1)',
                      animationDelay: `${i * 70}ms`,
                      animationFillMode: 'both',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.textSec, fontFamily: C.mono, width: 20, textAlign: 'right', flexShrink: 0 }}>{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Points by Category */}
        {data.points_by_category.length > 0 && (
          <div style={card}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>Points by Category</h3>
            <div role="img" aria-label="Points awarded by challenge category" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...data.points_by_category].sort((a, b) => b.points - a.points).map((c, i) => (
                <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 100, fontSize: 12.5, color: C.textSec, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.category}</span>
                  <div style={{ flex: 1, height: 14, background: C.surfaceLow, borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(c.points / maxCatPts) * 100}%`,
                      background: i === 0 ? 'linear-gradient(90deg, #8b5cf6, #a78bfa)' : i === 1 ? 'linear-gradient(90deg, #06b6d4, #38d9f5)' : `linear-gradient(90deg, ${C.primary}, #413ff4)`,
                      borderRadius: 5,
                      transformOrigin: 'left',
                      transform: 'scaleX(1)',
                      animation: 'barFill 0.6s cubic-bezier(0.16,1,0.3,1)',
                      animationDelay: `${i * 80}ms`,
                      animationFillMode: 'both',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, width: 52, textAlign: 'right', flexShrink: 0, fontFamily: C.mono, color: C.textSec }}>{c.points.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
