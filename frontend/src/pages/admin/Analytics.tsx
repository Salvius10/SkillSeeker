import { useState, useEffect } from 'react';
import { getAnalytics } from '../../api/client';
import type { AnalyticsData } from '../../types';

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>Loading…</div>;
  if (!data) return null;

  const maxPts = Math.max(...data.points_by_category.map(c => c.points), 1);

  const kpis = [
    { label: 'Participation Rate', val: `${data.participation_rate}%`, delta: '↑ vs last quarter', color: '#1a00d9' },
    { label: 'Avg Time to Submit', val: `${data.avg_days_to_submit}d`, delta: '↓ faster', color: '#1a00d9' },
    { label: 'Points Awarded', val: data.total_points_awarded.toLocaleString(), delta: '↑ growing', color: '#1a00d9' },
    { label: 'Challenges Posted', val: data.challenges_posted, delta: 'this quarter', color: '#1a00d9' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9aa3b5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: '#1f8a5b', marginTop: 4 }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {data.points_by_category.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 14, padding: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 800 }}>Points awarded by category</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.points_by_category.sort((a, b) => b.points - a.points).map((c, i) => (
              <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 110, fontSize: 13, color: '#69748c', textAlign: 'right', flexShrink: 0 }}>{c.category}</span>
                <div style={{ flex: 1, height: 20, background: '#f0f3fa', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(c.points / maxPts) * 100}%`, background: i === 0 ? '#1a00d9' : i === 1 ? '#5e9eff' : '#fe6e06', borderRadius: 6, transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, width: 56, textAlign: 'right', flexShrink: 0 }}>{c.points.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
