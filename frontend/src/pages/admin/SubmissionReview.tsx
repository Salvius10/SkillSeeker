import { useState, useEffect } from 'react';
import { Check, X, User, Calendar, CheckCircle2 } from 'lucide-react';
import { getSubmissions, reviewSubmission } from '../../api/client';
import type { Submission } from '../../types';
import { useAppContext } from '../../context/AppContext';

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

export default function SubmissionReview() {
  const { decrementPending: onReviewed } = useAppContext();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [reviewError, setReviewError] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const data = await getSubmissions();
      setSubmissions(data.filter((s: Submission) => s.status === 'pending'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const review = async (id: string, status: 'approved' | 'rejected') => {
    setProcessing(id);
    setReviewError(prev => ({ ...prev, [id]: '' }));
    try {
      await reviewSubmission(id, status, feedback[id]);
      onReviewed();
      load();
    } catch (e: unknown) {
      setReviewError(prev => ({ ...prev, [id]: (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Review failed. Try again.' }));
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>
      <div style={{ width: 36, height: 36, border: `3px solid #dae2fd`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
      {submissions.length === 0 && (
        <div style={{ background: C.surface, border: '1px solid #dae2fd', borderRadius: 16, padding: 56, textAlign: 'center', boxShadow: '0 4px 12px rgba(26,0,217,0.04)' }}>
          <CheckCircle2 size={48} color={C.success} style={{ marginBottom: 12, opacity: 0.7 }} />
          <div style={{ fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 4 }}>All caught up!</div>
          <div style={{ color: C.textMuted, fontSize: 14 }}>No pending submissions to review.</div>
        </div>
      )}

      {submissions.map(s => {
        const ch = s.challenge as { title: string; points: number; category: string } | undefined;
        const author = s.user as { name: string; team: string } | undefined;
        const isProcessing = processing === s.id;

        return (
          <div key={s.id} style={{ background: C.surface, border: '1px solid #dae2fd', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(26,0,217,0.04)' }}>
            {/* Top accent */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, #fe6e06, #ffa040)' }} />
            <div style={{ padding: 24 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>{ch?.title ?? 'Unknown challenge'}</h3>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12.5, color: C.textMuted, flexWrap: 'wrap' }}>
                    {author && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <User size={12} />{author.name}{author.team ? ` · ${author.team}` : ''}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} />{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <span style={{ background: '#fff3e8', color: C.orange, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, fontFamily: C.mono, letterSpacing: '0.03em' }}>PENDING</span>
                  {ch?.points && (
                    <span style={{ background: C.surfaceLow, color: C.primary, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, fontFamily: C.mono }}>{ch.points} pts</span>
                  )}
                </div>
              </div>

              {/* Submission content */}
              <div style={{ background: C.surfaceLow, border: '1px solid #dae2fd', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', fontFamily: C.mono, marginBottom: 6 }}>SUBMISSION</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: C.textSec }}>{s.content}</p>
              </div>

              {/* Feedback textarea */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', fontFamily: C.mono, marginBottom: 6 }}>FEEDBACK (optional)</div>
                <textarea
                  value={feedback[s.id] ?? ''}
                  onChange={e => setFeedback(f => ({ ...f, [s.id]: e.target.value }))}
                  placeholder="Share feedback with the submitter…"
                  rows={2}
                  style={{ width: '100%', border: '1px solid #dae2fd', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontFamily: C.sans, resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: C.surface, color: C.text }}
                />
              </div>

              {/* Actions */}
              {reviewError[s.id] && (
                <div style={{ fontSize: 12.5, color: '#d32f2f', background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{reviewError[s.id]}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => review(s.id, 'approved')}
                  disabled={isProcessing}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.success, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13.5, fontWeight: 700, fontFamily: C.sans, cursor: isProcessing ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.25)', opacity: isProcessing ? 0.7 : 1 }}
                >
                  <Check size={15} /> Approve{ch?.points ? ` · ${ch.points} pts` : ''}
                </button>
                <button
                  onClick={() => review(s.id, 'rejected')}
                  disabled={isProcessing}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff5f5', color: '#d32f2f', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 10, padding: '10px 20px', fontSize: 13.5, fontWeight: 700, fontFamily: C.sans, cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.7 : 1 }}
                >
                  <X size={15} /> Request Revision
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
