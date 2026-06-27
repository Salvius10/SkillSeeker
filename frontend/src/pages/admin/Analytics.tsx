import { useState, useEffect } from 'react';
import { Users, Clock, Zap, BarChart3, CheckCircle2, AlertCircle } from 'lucide-react';
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

function StatStrip({ kpis }: { kpis: { label: string; val: string | number; color: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${C.border}`, marginTop: 20 }}>
      {kpis.map((k, i) => (
        <div
          key={k.label}
          style={{
            flex: 1,
            padding: '14px 16px',
            borderRight: i < kpis.length - 1 ? `1px solid ${C.border}` : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color, fontFamily: C.mono, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{k.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
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

  const maxPts = Math.max(...data.points_by_category.map(c => c.points), 1);
  const maxTeamPts = Math.max(...data.team_stats.map(t => t.total_points), 1);
  const maxWeekCount = Math.max(...data.submissions_by_week.map(w => w.count), 1);

  const secondaryKpis = [
    { label: 'Avg days to review', val: `${data.avg_days_to_submit}d`, color: '#413ff4' },
    { label: 'Points awarded', val: data.total_points_awarded.toLocaleString(), color: C.orange },
    { label: 'Challenges posted', val: String(data.challenges_posted), color: '#06b6d4' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.2s ease' }}>

      {/* Primary KPIs — three hero metrics that matter most to program health */}
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
            <div style={{ fontSize: 42, fontWeight: 900, color: C.primary, fontFamily: C.mono, lineHeight: 1, letterSpacing: '-1px' }}>{data.participation_rate}<span style={{ fontSize: 22, fontWeight: 700 }}>%</span></div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6 }}>of employees have submitted</div>
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
            <div style={{ fontSize: 42, fontWeight: 900, color: data.pending_count > 0 ? '#d32f2f' : C.success, fontFamily: C.mono, lineHeight: 1, letterSpacing: '-1px' }}>{data.pending_count}</div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6 }}>{data.pending_count > 0 ? 'submissions awaiting review' : 'all submissions reviewed'}</div>
          </div>
        </div>

        {/* Approval Rate */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${data.approval_rate >= 70 ? C.success : C.orange}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={20} color={data.approval_rate >= 70 ? C.success : C.orange} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>Approval Rate</span>
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: data.approval_rate >= 70 ? C.success : C.orange, fontFamily: C.mono, lineHeight: 1, letterSpacing: '-1px' }}>{data.approval_rate}<span style={{ fontSize: 22, fontWeight: 700 }}>%</span></div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6 }}>of decided submissions approved</div>
          </div>
          <StatStrip kpis={secondaryKpis} />
        </div>
      </div>

      {/* Top Performers */}
      {data.top_employees.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>Top Performers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 120px 80px 80px', gap: 12, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: C.mono, padding: '0 8px 10px', borderBottom: `1px solid ${C.border}` }}>
              <span>#</span><span>Employee</span><span>Team</span><span style={{ textAlign: 'right' }}>Points</span><span style={{ textAlign: 'right' }}>Done</span>
            </div>
            {data.top_employees.map((e, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 120px 80px 80px', gap: 12, alignItems: 'center', padding: '10px 8px', borderRadius: 10, background: i === 0 ? `${C.orange}08` : undefined }}>
                <span style={{ fontWeight: 900, fontSize: 15, color: RANK_COLORS[i] ?? C.textMuted, fontFamily: C.mono }}>#{i + 1}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{e.name}</span>
                <span style={{ fontSize: 12, color: C.textSec, background: C.surfaceLow, borderRadius: 20, padding: '3px 10px', display: 'inline-block', fontFamily: C.mono }}>{e.team}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.primary, textAlign: 'right', fontFamily: C.mono }}>{e.points.toLocaleString()}</span>
                <span style={{ fontSize: 13, color: C.success, textAlign: 'right', fontWeight: 700, fontFamily: C.mono }}>{e.completions}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission Activity chart */}
      {data.submissions_by_week.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>Submission Activity — last 8 weeks</h3>
          <div
            role="img"
            aria-label={`Submission activity over the last ${data.submissions_by_week.length} weeks. Peak: ${maxWeekCount} submissions.`}
            style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, paddingBottom: 32, position: 'relative' }}
          >
            {data.submissions_by_week.map((w) => (
              <div key={w.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, fontFamily: C.mono }}>{w.count}</span>
                <div style={{ width: '75%', background: C.surfaceLow, borderRadius: '5px 5px 0 0', height: `${Math.max((w.count / maxWeekCount) * 100, 4)}%`, overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: `linear-gradient(180deg, ${C.primary} 0%, #413ff4 100%)`, transformOrigin: 'bottom', transform: `scaleY(1)`, boxShadow: '0 -2px 8px rgba(26,0,217,0.15)', borderRadius: '5px 5px 0 0' }} />
                </div>
                <div style={{ position: 'absolute', bottom: 4, fontSize: 10, color: C.textMuted, fontFamily: C.mono }}>
                  <WeekLabel week={w.week} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Performance */}
      {data.team_stats.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>Team Performance</h3>
          <div
            role="img"
            aria-label="Team performance bar chart by total points"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {data.team_stats.map((t, i) => (
              <div key={t.team} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 120, fontSize: 13, color: C.textSec, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.team}</span>
                <div style={{ flex: 1, height: 18, background: C.surfaceLow, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(t.total_points / maxTeamPts) * 100}%`,
                    background: i === 0 ? `linear-gradient(90deg, ${C.primary}, #413ff4)` : i === 1 ? 'linear-gradient(90deg, #5e9eff, #7ab8ff)' : `linear-gradient(90deg, ${C.orange}, #ff8c38)`,
                    borderRadius: 6,
                    transformOrigin: 'left',
                    transform: 'scaleX(1)',
                  }} />
                </div>
                <span style={{ fontSize: 11.5, color: C.textMuted, width: 64, textAlign: 'right', flexShrink: 0 }}>{t.member_count} members</span>
                <span style={{ fontSize: 13, fontWeight: 700, width: 60, textAlign: 'right', flexShrink: 0, fontFamily: C.mono }}>{t.total_points.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points by Category */}
      {data.points_by_category.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: C.text }}>Points by Category</h3>
          <div
            role="img"
            aria-label="Points awarded by challenge category"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {[...data.points_by_category].sort((a, b) => b.points - a.points).map((c, i) => (
              <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 110, fontSize: 12.5, color: C.textSec, textAlign: 'right', flexShrink: 0 }}>{c.category}</span>
                <div style={{ flex: 1, height: 18, background: C.surfaceLow, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(c.points / maxPts) * 100}%`,
                    background: i === 0 ? 'linear-gradient(90deg, #8b5cf6, #a78bfa)' : i === 1 ? 'linear-gradient(90deg, #06b6d4, #38d9f5)' : `linear-gradient(90deg, ${C.primary}, #413ff4)`,
                    borderRadius: 6,
                    transformOrigin: 'left',
                    transform: 'scaleX(1)',
                  }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, width: 60, textAlign: 'right', flexShrink: 0, fontFamily: C.mono }}>{c.points.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
