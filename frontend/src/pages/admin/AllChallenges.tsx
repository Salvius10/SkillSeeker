import { useState, useEffect } from 'react';
import { getChallenges } from '../../api/client';
import type { Challenge } from '../../types';

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: '#fee7e0', fg: '#d32f2f' },
  open: { bg: '#e6f1ff', fg: '#2a6fdb' },
  closed: { bg: '#f0f3fa', fg: '#5e6d8a' },
};

export default function AllChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChallenges().then(setChallenges).finally(() => setLoading(false));
  }, []);

  const totalPts = challenges.reduce((s, c) => s + c.points, 0);
  const open = challenges.filter(c => c.status === 'open').length;
  const urgent = challenges.filter(c => c.priority === 'urgent').length;

  if (loading) return <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Challenges', val: challenges.length, color: '#1a00d9' },
          { label: 'Open', val: open, color: '#1f8a5b' },
          { label: 'Urgent', val: urgent, color: '#fe6e06' },
          { label: 'Total Points Pool', val: totalPts.toLocaleString(), color: '#2a6fdb' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 140, background: '#fff', border: '1px solid #e7edf8', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9aa3b5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 110px', padding: '12px 20px', background: '#f6f8fc', borderBottom: '1px solid #e7edf8', fontSize: 11, fontWeight: 700, color: '#9aa3b5', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          <span>Challenge</span><span style={{ textAlign: 'center' }}>Status</span><span style={{ textAlign: 'center' }}>Entries</span><span style={{ textAlign: 'right' }}>Points</span><span style={{ textAlign: 'right' }}>Due</span>
        </div>
        {challenges.map(c => {
          const key = c.priority === 'urgent' ? 'urgent' : c.status;
          const { bg, fg } = STATUS_STYLE[key] ?? { bg: '#f0f3fa', fg: '#5e6d8a' };
          return (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 110px', padding: '14px 20px', borderBottom: '1px solid #f0f3fa', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: '#9aa3b5' }}>{c.category}</div>
              </div>
              <span style={{ textAlign: 'center' }}>
                <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' }}>
                  {c.priority === 'urgent' ? 'Urgent' : c.status}
                </span>
              </span>
              <span style={{ textAlign: 'center', color: '#69748c', fontSize: 13 }}>{c.entry_count ?? 0}</span>
              <span style={{ textAlign: 'right', fontWeight: 700, color: '#1a00d9', fontSize: 13 }}>{c.points}</span>
              <span style={{ textAlign: 'right', fontSize: 12, color: '#9aa3b5' }}>
                {c.due_date ? new Date(c.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </span>
            </div>
          );
        })}
        {challenges.length === 0 && <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 32 }}>No challenges yet.</div>}
      </div>
    </div>
  );
}
