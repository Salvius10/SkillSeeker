import { useState, useEffect } from 'react';
import { Bookmark, Clock, Code, FlaskConical, Sparkles, MessageCircle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getChallenges, getMyPicks, submitChallenge, unpickChallenge } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Challenge } from '../types';
import SubmissionThread from '../components/SubmissionThread';
import ChallengeModal from '../components/ChallengeModal';

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
  danger: '#d32f2f',
  coding: '#8b5cf6',
  research: '#06b6d4',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

function catConfig(cat: string): { color: string; bg: string; icon: React.ReactNode } {
  const c = cat.toLowerCase();
  if (c.includes('cod') || c.includes('dev') || c.includes('eng')) return { color: C.coding, bg: 'rgba(139,92,246,0.10)', icon: <Code size={11} /> };
  if (c.includes('res') || c.includes('ux') || c.includes('design')) return { color: C.research, bg: 'rgba(6,182,212,0.10)', icon: <FlaskConical size={11} /> };
  return { color: C.primary, bg: 'rgba(26,0,217,0.08)', icon: <Sparkles size={11} /> };
}

const STATUS_META: Record<string, { bg: string; fg: string; label: string; icon: React.ReactNode }> = {
  pending:  { bg: '#fff3e8', fg: C.orange,  label: 'In Review',       icon: <AlertCircle size={13} /> },
  approved: { bg: 'rgba(16,185,129,0.10)', fg: C.success, label: 'Approved', icon: <CheckCircle2 size={13} /> },
  rejected: { bg: '#fee7e0', fg: C.danger,  label: 'Needs Revision',  icon: <XCircle size={13} /> },
};

export default function MyChallenges() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myPicks, setMyPicks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [unpickError, setUnpickError] = useState('');
  const [modalChallenge, setModalChallenge] = useState<Challenge | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadStatus, setThreadStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [threadType, setThreadType] = useState('text');
  const [threadAllowedTypes, setThreadAllowedTypes] = useState<string[] | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [all, picks] = await Promise.all([getChallenges(), getMyPicks()]);
      setMyPicks(picks);
      setChallenges(all.filter((c: Challenge) => picks.includes(c.id)));
    } catch {
      setLoadError('Failed to load your challenges. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (modalChallenge) {
      const updated = challenges.find(c => c.id === modalChallenge.id);
      if (updated) setModalChallenge(updated);
    }
  }, [challenges]);

  const openThread = (c: Challenge) => {
    if (!c.my_submission_id) return;
    setThreadId(c.my_submission_id);
    setThreadTitle(c.title);
    setThreadStatus(c.my_submission_status as 'pending' | 'approved' | 'rejected');
    setThreadType(c.my_submission_type ?? 'text');
    setThreadAllowedTypes(c.allowed_submission_types ?? null);
  };

  const handleUnpick = async (challengeId: string) => {
    setUnpickError('');
    try {
      await unpickChallenge(challengeId);
      load();
    } catch (e: unknown) {
      setUnpickError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not remove pick. Please try again.');
    }
  };

  const approved = challenges.filter(c => c.my_submission_status === 'approved').length;
  const pending = challenges.filter(c => c.my_submission_status === 'pending').length;
  const notSubmitted = challenges.filter(c => !c.my_submission_status).length;

  if (loading) return (
    <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>
      <div style={{ width: 36, height: 36, border: `3px solid #dae2fd`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(26,0,217,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bookmark size={18} color={C.primary} />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>My Challenges</h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: C.textMuted }}>Challenges you've claimed — work on them, join the discussion, and submit your solution.</p>
      </div>

      {loadError && (
        <div style={{ background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13.5, color: '#d32f2f', marginBottom: 8 }}>{loadError}</div>
      )}

      {unpickError && (
        <div style={{ background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13.5, color: '#d32f2f', marginBottom: 8 }}>{unpickError}</div>
      )}

      {/* Stats row */}
      {challenges.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'To Submit',  val: notSubmitted, color: C.primary, bg: 'rgba(26,0,217,0.08)' },
            { label: 'In Review',  val: pending,      color: C.orange,  bg: '#fff3e8' },
            { label: 'Approved',   val: approved,     color: C.success, bg: 'rgba(16,185,129,0.08)' },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: '1px solid #dae2fd', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 4px 12px rgba(26,0,217,0.04)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: C.mono }}>{s.val}</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textSec }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {challenges.length === 0 && (
        <div style={{ background: C.surface, border: '1px solid #dae2fd', borderRadius: 16, padding: '48px 32px', textAlign: 'center', boxShadow: '0 4px 12px rgba(26,0,217,0.04)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(26,0,217,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Bookmark size={26} color={C.primary} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>No challenges picked yet</div>
          <div style={{ fontSize: 14, color: C.textMuted, maxWidth: 340, margin: '0 auto', lineHeight: 1.6 }}>
            Head to <strong>All Challenges</strong> to browse available opportunities and pick one to get started.
          </div>
        </div>
      )}

      {/* Challenge cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {challenges.map((c, index) => {
          const cat = catConfig(c.category);
          const sub = c.my_submission_status ? STATUS_META[c.my_submission_status] : null;

          return (
            <div
              key={c.id}
              style={{
                background: C.surface,
                border: '1px solid #dae2fd',
                borderRadius: 16,
                padding: '20px 22px',
                boxShadow: '0 4px 12px rgba(26,0,217,0.04)',
                animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
                animationDelay: `${Math.min(index, 5) * 50}ms`,
                animationFillMode: 'both',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cat.bg, color: cat.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 9px 3px 7px', borderRadius: 20, fontFamily: C.mono }}>
                      {cat.icon}{c.category}
                    </span>
                    {c.priority === 'urgent' && (
                      <span style={{ background: '#fee7e0', color: C.danger, fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 20, fontFamily: C.mono }}>URGENT</span>
                    )}
                    {sub ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: sub.bg, color: sub.fg, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {sub.icon} {sub.label}
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(26,0,217,0.08)', color: C.primary, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, fontFamily: C.mono }}>NOT SUBMITTED</span>
                    )}
                  </div>

                  <h3 style={{ margin: '0 0 5px', fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '-0.2px', lineHeight: 1.3 }}>{c.title}</h3>
                  <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.6, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{c.description}</p>

                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: C.textMuted, flexWrap: 'wrap' }}>
                    {c.due_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />Due {new Date(c.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span style={{ fontFamily: C.mono }}>{c.points} pts</span>
                    <span style={{ fontFamily: C.mono }}>{c.entry_count ?? 0} entries</span>
                  </div>
                </div>

                {/* Points badge */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.orange, fontFamily: C.mono }}>{c.points}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, fontFamily: C.mono }}>POINTS</div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid #e7edf8' }}>
                <button
                  onClick={() => setModalChallenge(c)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,0,217,0.2)' }}
                >
                  {!c.my_submission_status ? 'Submit / View Thread' : 'View Details'}
                </button>

                {c.my_submission_id && (
                  <button
                    onClick={() => openThread(c)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surfaceLow, color: C.primary, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}
                  >
                    <MessageCircle size={14} /> Review Thread
                  </button>
                )}

                {!c.my_submission_status && (
                  <button
                    onClick={() => handleUnpick(c.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: C.textMuted, border: '1px solid #dae2fd', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, fontFamily: C.sans, cursor: 'pointer' }}
                  >
                    Unpick
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Challenge detail + social thread modal */}
      {modalChallenge && (
        <ChallengeModal
          challenge={modalChallenge}
          currentUserId={currentUserId}
          isPicked={myPicks.includes(modalChallenge.id)}
          hasSubmission={!!modalChallenge.my_submission_status}
          submissionStatus={modalChallenge.my_submission_status}
          submissionId={modalChallenge.my_submission_id}
          submissionType={modalChallenge.my_submission_type}
          onPick={async () => {}}
          onUnpick={() => handleUnpick(modalChallenge.id)}
          onSubmitSuccess={() => { setModalChallenge(null); load(); }}
          onViewSubmissionThread={() => {
            openThread(modalChallenge);
            setModalChallenge(null);
          }}
          onClose={() => setModalChallenge(null)}
          submitChallengeFn={(id, content, type) => submitChallenge(id, content, type)}
        />
      )}

      {/* Submission review thread */}
      {threadId && (
        <SubmissionThread
          submissionId={threadId}
          challengeTitle={threadTitle}
          submissionType={threadType}
          status={threadStatus}
          allowedTypes={threadAllowedTypes}
          onClose={() => { setThreadId(null); load(); }}
        />
      )}
    </div>
  );
}
