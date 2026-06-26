import { useState, useEffect } from 'react';
import { getSubmissions, reviewSubmission } from '../../api/client';
import type { Submission } from '../../types';

interface Props { onReviewed: () => void; }

export default function SubmissionReview({ onReviewed }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const load = async () => {
    const data = await getSubmissions();
    setSubmissions(data.filter((s: Submission) => s.status === 'pending'));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const review = async (id: string, status: 'approved' | 'rejected') => {
    setProcessing(id);
    try {
      await reviewSubmission(id, status, feedback[id]);
      onReviewed();
      load();
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {submissions.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 14, padding: 40, textAlign: 'center', color: '#9aa3b5' }}>
          No pending submissions. All caught up! ✅
        </div>
      )}
      {submissions.map(s => {
        const ch = s.challenge as { title: string; points: number; category: string } | undefined;
        const user = s.user as { name: string; team: string } | undefined;
        return (
          <div key={s.id} style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>{ch?.title ?? 'Unknown challenge'}</h3>
                <div style={{ fontSize: 13, color: '#69748c' }}>
                  Submitted by {user?.name ?? 'Unknown'}{user?.team ? ` · ${user.team}` : ''} · {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <span style={{ background: '#fee7e0', color: '#d32f2f', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 7, flexShrink: 0 }}>Awaiting review</span>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.6, color: '#566080' }}>{s.content}</p>
            <div style={{ marginBottom: 14 }}>
              <textarea
                value={feedback[s.id] ?? ''}
                onChange={e => setFeedback(f => ({ ...f, [s.id]: e.target.value }))}
                placeholder="Optional feedback for the submitter…"
                rows={2}
                style={{ width: '100%', border: '1px solid #e2e8f4', borderRadius: 10, padding: 12, fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => review(s.id, 'approved')} disabled={processing === s.id} style={{ background: '#1f8a5b', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                ✓ Approve{ch?.points ? ` · ${ch.points} pts` : ''}
              </button>
              <button onClick={() => review(s.id, 'rejected')} disabled={processing === s.id} style={{ background: '#f6f8fc', color: '#d32f2f', border: '1px solid #fdd', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                ✗ Request revision
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
