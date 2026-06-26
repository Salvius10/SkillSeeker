import { useState, useEffect } from 'react';
import { Search, Calendar, Clock, X } from 'lucide-react';
import { getChallenges, submitChallenge } from '../api/client';
import type { Challenge } from '../types';

const TAG_STYLE: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: '#fee7e0', fg: '#d32f2f' },
  open: { bg: '#e6f1ff', fg: '#2a6fdb' },
  pending: { bg: '#f0f3fa', fg: '#5e6d8a' },
  closed: { bg: '#f0f3fa', fg: '#5e6d8a' },
};

function tagKey(c: Challenge) {
  if (c.priority === 'urgent') return 'urgent';
  if (c.my_submission_status === 'pending') return 'pending';
  if (c.status === 'open') return 'open';
  return 'closed';
}

function tagLabel(c: Challenge) {
  if (c.priority === 'urgent') return 'URGENT';
  if (c.my_submission_status === 'pending') return 'PENDING';
  if (c.my_submission_status === 'approved') return 'APPROVED';
  if (c.status === 'open') return 'OPEN';
  return 'CLOSED';
}

function btnProps(c: Challenge) {
  if (c.my_submission_status === 'pending') return { text: 'Pending', bg: '#f6f8fc', fg: '#69748c', border: '#e7edf8' };
  if (c.my_submission_status === 'approved') return { text: 'Approved ✓', bg: '#e6f7ef', fg: '#1f8a5b', border: '#b8e8d0' };
  if (c.status === 'closed') return { text: 'Closed', bg: '#f6f8fc', fg: '#9aa3b5', border: '#e7edf8' };
  return { text: 'Submit', bg: '#1a00d9', fg: '#fff', border: 'transparent' };
}

const filterBtn = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: active ? '#1a00d9' : '#f6f8fc',
  color: active ? '#fff' : '#69748c',
  border: active ? 'none' : '1px solid #e7edf8',
  borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer',
});

interface Props {
  filter: string;
  setFilter: (f: string) => void;
  minPoints: number;
  setMinPoints: (n: number) => void;
}

export default function Challenges({ filter, setFilter, minPoints, setMinPoints }: Props) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitId, setSubmitId] = useState<string | null>(null);
  const [submitContent, setSubmitContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getChallenges({ filter: filter === 'all' ? undefined : filter, minPoints: minPoints || undefined });
      setChallenges(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter, minPoints]);

  const visible = challenges.filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: challenges.length,
    open: challenges.filter(c => c.status === 'open').length,
    inProgress: challenges.filter(c => c.my_submission_status === 'pending').length,
    pending: challenges.filter(c => c.my_submission_status === 'pending').length,
    urgent: challenges.filter(c => c.priority === 'urgent').length,
  };

  const handleSubmit = async (c: Challenge) => {
    if (c.my_submission_status || c.status === 'closed') return;
    if (submitId === c.id) {
      // confirm submit
      if (!submitContent.trim()) return;
      setSubmitting(true);
      try {
        await submitChallenge(c.id, submitContent);
        setSubmitId(null);
        setSubmitContent('');
        load();
      } catch (e: unknown) {
        alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error submitting');
      } finally {
        setSubmitting(false);
      }
    } else {
      setSubmitId(c.id);
      setSubmitContent('');
    }
  };

  return (
    <div>
      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: 14, color: '#9aa3b5' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search challenges, skills, topics…" style={{ width: '100%', height: 44, border: '1px solid #e2e8f4', borderRadius: 12, padding: '0 14px 0 40px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', background: '#f6f8fc', borderRadius: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9aa3b5' }}>MIN PTS</span>
          <input type="range" min={0} max={500} step={50} value={minPoints} onChange={e => setMinPoints(Number(e.target.value))} style={{ width: 120 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a00d9', minWidth: 32 }}>{minPoints}</span>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={filterBtn(filter === 'all')}>All {counts.all}</button>
        <button onClick={() => setFilter('open')} style={filterBtn(filter === 'open')}>Open {counts.open}</button>
        <button onClick={() => setFilter('inProgress')} style={filterBtn(filter === 'inProgress')}>In Progress {counts.inProgress}</button>
        <button onClick={() => setFilter('pending')} style={filterBtn(filter === 'pending')}>Pending {counts.pending}</button>
        <button onClick={() => setFilter('urgent')} style={filterBtn(filter === 'urgent')}>Urgent {counts.urgent}</button>
      </div>

      {/* Live ticker */}
      {challenges.some(c => c.priority === 'urgent') && (
        <div style={{ background: 'linear-gradient(90deg, #fe6e06 0%, #ff8a2a 100%)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
          <span style={{ fontSize: 18 }}>🔴</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>LIVE</div>
            <div style={{ fontSize: 12.5, opacity: 0.9 }}>Urgent challenge available — submit before the deadline!</div>
          </div>
          <span style={{ background: '#fff', color: '#fe6e06', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase' }}>UP TO {Math.max(...challenges.filter(c => c.priority === 'urgent').map(c => c.points))} pts</span>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map(c => {
            const tk = tagKey(c);
            const { bg: tagBg, fg: tagFg } = TAG_STYLE[tk] ?? { bg: '#f0f3fa', fg: '#5e6d8a' };
            const btn = btnProps(c);
            return (
              <div key={c.id} style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 14, padding: 20, boxShadow: '0 1px 2px rgba(26,0,217,0.04)', display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ display: 'inline-block', background: tagBg, color: tagFg, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.4px', padding: '4px 10px', borderRadius: 7, textTransform: 'uppercase' }}>{tagLabel(c)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9aa3b5' }}>{c.category.toUpperCase()}</span>
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, letterSpacing: '-0.2px', color: '#1a0033' }}>{c.title}</h3>
                  <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.6, color: '#566080' }}>{c.description}</p>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9aa3b5' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />Posted {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    {c.due_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />Due {new Date(c.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  </div>

                  {/* Inline submit form */}
                  {submitId === c.id && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea value={submitContent} onChange={e => setSubmitContent(e.target.value)} placeholder="Describe your solution, link your PR or write-up…" rows={4} style={{ border: '1px solid #e2e8f4', borderRadius: 10, padding: 12, fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleSubmit(c)} disabled={submitting} style={{ background: '#1a00d9', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                          {submitting ? 'Submitting…' : 'Confirm submit'}
                        </button>
                        <button onClick={() => setSubmitId(null)} style={{ background: '#f6f8fc', color: '#69748c', border: '1px solid #e7edf8', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><X size={12} />Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <button onClick={() => handleSubmit(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: btn.bg, color: btn.fg, border: `1px solid ${btn.border}`, borderRadius: 9, padding: '8px 16px', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: c.my_submission_status || c.status === 'closed' ? 'default' : 'pointer' }}>{btn.text}</button>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a00d9' }}>{c.points} pts</div>
                    <div style={{ fontSize: 11, color: '#9aa3b5' }}>{c.entry_count ?? 0} entries</div>
                  </div>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>No challenges match your filters.</div>}
        </div>
      )}
    </div>
  );
}
