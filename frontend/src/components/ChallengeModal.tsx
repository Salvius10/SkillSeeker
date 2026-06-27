import { useState, useEffect, useRef } from 'react';
import {
  X, Clock, Flame, Code, FlaskConical, Sparkles, Heart, Send,
  CheckCircle2, XCircle, MessageCircle, Target, AlertTriangle,
} from 'lucide-react';
import { getChallengeComments, postChallengeComment, toggleCommentLike } from '../api/client';
import type { Challenge, ChallengeComment } from '../types';

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
  danger: '#d32f2f',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

function catConfig(cat: string): { color: string; bg: string; icon: React.ReactNode } {
  const c = cat.toLowerCase();
  if (c.includes('cod') || c.includes('dev') || c.includes('eng'))
    return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', icon: <Code size={11} /> };
  if (c.includes('res') || c.includes('ux') || c.includes('design'))
    return { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)', icon: <FlaskConical size={11} /> };
  return { color: C.primary, bg: 'rgba(26,0,217,0.08)', icon: <Sparkles size={11} /> };
}

const FORMAT_OPTIONS = [
  { key: 'text', label: '✍ Text' },
  { key: 'github_url', label: ' GitHub URL' },
  { key: 'presentation_url', label: '📊 Presentation' },
  { key: 'folder_url', label: '📁 Folder URL' },
] as const;

interface Props {
  challenge: Challenge;
  currentUserId: string;
  isPicked: boolean;
  hasSubmission: boolean;
  submissionStatus?: string | null;
  submissionId?: string | null;
  submissionType?: string | null;
  onPick: () => Promise<void>;
  onUnpick: () => Promise<void>;
  onSubmitSuccess: () => void;
  onViewSubmissionThread: () => void;
  onClose: () => void;
  submitChallengeFn: (id: string, content: string, type: string) => Promise<void>;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Initials({ name }: { name: string }) {
  const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1a00d9, #413ff4)',
      color: '#fff', fontWeight: 800, fontSize: 11,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {ini}
    </div>
  );
}

export default function ChallengeModal({
  challenge, currentUserId, isPicked, hasSubmission,
  submissionStatus, submissionId, submissionType,
  onPick, onUnpick, onSubmitSuccess, onViewSubmissionThread, onClose,
  submitChallengeFn,
}: Props) {
  const [comments, setComments] = useState<ChallengeComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitContent, setSubmitContent] = useState('');
  const [submitType, setSubmitType] = useState<'text' | 'github_url' | 'presentation_url' | 'folder_url'>('text');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);

  const isPickedByOther = !!(challenge.picked_by && challenge.picked_by.id !== currentUserId);
  const isPickedByAnyone = !!challenge.picked_by;

  useEffect(() => {
    if (!isPickedByAnyone) return;
    setCommentsLoading(true);
    getChallengeComments(challenge.id)
      .then(setComments)
      .finally(() => setCommentsLoading(false));
  }, [challenge.id, isPickedByAnyone]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [comments]);

  const handlePick = async () => {
    setPickError('');
    setPicking(true);
    try { await onPick(); } catch (e: unknown) {
      setPickError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not pick. Try again.');
    } finally { setPicking(false); }
  };

  const handleUnpick = async () => {
    setPicking(true);
    try { await onUnpick(); } catch {}
    finally { setPicking(false); }
  };

  const handleSendComment = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    try {
      const c = await postChallengeComment(challenge.id, newMsg.trim());
      setComments(prev => [...prev, c]);
      setNewMsg('');
    } finally { setSending(false); }
  };

  const handleLike = async (comment: ChallengeComment) => {
    const result = await toggleCommentLike(challenge.id, comment.id);
    setComments(prev => prev.map(c => c.id === comment.id
      ? { ...c, my_like: result.liked, like_count: result.liked ? c.like_count + 1 : c.like_count - 1 }
      : c
    ));
  };

  const handleSubmit = async () => {
    if (!submitContent.trim()) { setSubmitError('Please add your submission content.'); return; }
    setSubmitError('');
    setSubmitting(true);
    try {
      await submitChallengeFn(challenge.id, submitContent, submitType);
      setShowSubmit(false);
      onSubmitSuccess();
    } catch (e: unknown) {
      setSubmitError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Submission failed. Try again.');
    } finally { setSubmitting(false); }
  };

  const cat = catConfig(challenge.category);

  const statusChip = () => {
    if (!hasSubmission) return null;
    const map: Record<string, { bg: string; fg: string; label: string; icon: React.ReactNode }> = {
      pending:  { bg: '#fff3e8', fg: C.orange,  label: 'In Review',  icon: <Clock size={12} /> },
      approved: { bg: 'rgba(16,185,129,0.1)', fg: C.success, label: 'Approved', icon: <CheckCircle2 size={12} /> },
      rejected: { bg: '#fee7e0', fg: C.danger,  label: 'Needs Revision', icon: <XCircle size={12} /> },
    };
    const s = map[submissionStatus ?? ''];
    if (!s) return null;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, color: s.fg, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
        {s.icon} {s.label}
      </span>
    );
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,0,100,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 1000, padding: '32px 16px', overflowY: 'auto',
        animation: 'backdropIn 0.2s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 680, background: C.surface, borderRadius: 20,
        boxShadow: '0 24px 80px rgba(26,0,217,0.18)', overflow: 'hidden',
        animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        marginBottom: 32,
      }}>
        {/* Color bar */}
        <div style={{ height: 5, background: `linear-gradient(90deg, #0f0099, ${C.primary}, ${C.orange})` }} />

        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cat.bg, color: cat.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 9px 3px 7px', borderRadius: 20, fontFamily: C.mono }}>
                {cat.icon}{challenge.category}
              </span>
              {challenge.priority === 'urgent' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fee7e0', color: C.danger, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, fontFamily: C.mono }}>
                  <Flame size={10} /> URGENT
                </span>
              )}
              {challenge.status === 'closed' && (
                <span style={{ background: C.surfaceLow, color: C.textMuted, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, fontFamily: C.mono }}>CLOSED</span>
              )}
              {statusChip()}
            </div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.3px', lineHeight: 1.3 }}>{challenge.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: C.surfaceLow, border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: C.textMuted, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Meta row */}
        <div style={{ padding: '10px 24px 0', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: C.orange, fontFamily: C.mono }}>{challenge.points}</span>
            <span style={{ fontSize: 11, color: C.textMuted, fontFamily: C.mono }}>POINTS</span>
          </div>
          {challenge.due_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.textSec }}>
              <Clock size={14} color={C.textMuted} />
              Due {new Date(challenge.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: C.mono }}>
            {challenge.entry_count ?? 0} entries
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: '14px 24px 0' }}>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: C.textSec }}>{challenge.description}</p>
        </div>

        {/* Picker info */}
        {challenge.picked_by && (
          <div style={{ margin: '14px 24px 0', display: 'flex', alignItems: 'center', gap: 8, background: isPicked ? 'rgba(16,185,129,0.08)' : 'rgba(254,110,6,0.08)', border: `1px solid ${isPicked ? 'rgba(16,185,129,0.2)' : 'rgba(254,110,6,0.2)'}`, borderRadius: 10, padding: '9px 14px' }}>
            <Target size={14} color={isPicked ? C.success : C.orange} />
            <span style={{ fontSize: 13, fontWeight: 700, color: isPicked ? C.success : C.orange }}>
              {isPicked ? 'You picked this challenge' : `Picked by ${challenge.picked_by.name}`}
            </span>
          </div>
        )}

        {/* Submit form */}
        {showSubmit && isPicked && !hasSubmission && (
          <div style={{ margin: '16px 24px 0', background: C.surfaceLow, border: '1px solid #dae2fd', borderRadius: 14, padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Submit your work</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {FORMAT_OPTIONS.map(f => (
                <button key={f.key} type="button" onClick={() => setSubmitType(f.key)} style={{ padding: '6px 12px', borderRadius: 8, border: `2px solid ${submitType === f.key ? C.primary : '#dae2fd'}`, background: submitType === f.key ? '#eaedff' : C.surface, color: submitType === f.key ? C.primary : C.textSec, fontSize: 12, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}>{f.label}</button>
              ))}
            </div>
            <textarea
              value={submitContent}
              onChange={e => setSubmitContent(e.target.value)}
              placeholder={submitType === 'text' ? 'Describe your solution…' : 'Paste your URL here…'}
              rows={4}
              style={{ width: '100%', border: '1px solid #dae2fd', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontFamily: C.sans, resize: 'vertical', outline: 'none', background: C.surface, boxSizing: 'border-box' }}
            />
            {submitError && <div style={{ fontSize: 12.5, color: C.danger, background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>{submitError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={handleSubmit} disabled={submitting} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 20px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,0,217,0.2)' }}>
                {submitting ? 'Submitting…' : 'Confirm Submit'}
              </button>
              <button onClick={() => { setShowSubmit(false); setSubmitError(''); }} style={{ background: C.surface, color: C.textSec, border: '1px solid #dae2fd', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ padding: '14px 24px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: isPickedByAnyone ? '1px solid #e7edf8' : 'none', marginTop: 6 }}>
          {!isPickedByAnyone && challenge.status === 'open' && (
            <button onClick={handlePick} disabled={picking} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13.5, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,0,217,0.2)' }}>
              {picking ? 'Picking…' : '+ Pick Challenge'}
            </button>
          )}
          {isPicked && !hasSubmission && !showSubmit && (
            <button onClick={() => setShowSubmit(true)} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13.5, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,0,217,0.2)' }}>
              Submit Work
            </button>
          )}
          {isPicked && hasSubmission && submissionId && (
            <button onClick={onViewSubmissionThread} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surfaceLow, color: C.primary, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}>
              <MessageCircle size={14} /> Review Thread
            </button>
          )}
          {isPicked && !hasSubmission && (
            <button onClick={handleUnpick} disabled={picking} style={{ background: 'transparent', color: C.textMuted, border: `1px solid #dae2fd`, borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, fontFamily: C.sans, cursor: 'pointer' }}>
              Unpick
            </button>
          )}
          {isPickedByOther && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff3e8', color: C.orange, border: '1px solid rgba(254,110,6,0.2)', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 700 }}>
              <AlertTriangle size={14} /> Already taken
            </span>
          )}
          {pickError && <span style={{ fontSize: 12.5, color: C.danger }}>{pickError}</span>}
        </div>

        {/* Social thread */}
        {isPickedByAnyone && (
          <div style={{ padding: '0 0 0' }}>
            <div style={{ padding: '14px 24px 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <MessageCircle size={16} color={C.primary} />
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Discussion</span>
              <span style={{ fontSize: 12, color: C.textMuted, fontFamily: C.mono }}>{comments.length} comments</span>
            </div>

            {/* Comments list */}
            <div
              ref={threadRef}
              style={{ maxHeight: 320, overflowY: 'auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {commentsLoading ? (
                <div style={{ textAlign: 'center', color: C.textMuted, padding: '20px 0', fontSize: 13 }}>Loading…</div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: C.textMuted, padding: '20px 0', fontSize: 13 }}>
                  No comments yet — be the first to share thoughts!
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} style={{ display: 'flex', gap: 10 }}>
                    <Initials name={comment.author?.name ?? '?'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{comment.author?.name}</span>
                        {comment.author?.team && (
                          <span style={{ fontSize: 11, color: C.textMuted, background: C.surfaceLow, borderRadius: 20, padding: '1px 7px', fontFamily: C.mono }}>{comment.author.team}</span>
                        )}
                        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 'auto' }}>{timeAgo(comment.created_at)}</span>
                      </div>
                      <p style={{ margin: '0 0 6px', fontSize: 13.5, lineHeight: 1.6, color: C.textSec, wordBreak: 'break-word' }}>{comment.message}</p>
                      <button
                        onClick={() => handleLike(comment)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: comment.my_like ? 'rgba(254,110,6,0.1)' : 'transparent',
                          border: comment.my_like ? '1px solid rgba(254,110,6,0.3)' : '1px solid #e7edf8',
                          borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                          color: comment.my_like ? C.orange : C.textMuted,
                          cursor: 'pointer', fontFamily: C.sans,
                          transition: 'all 0.15s',
                        }}
                      >
                        <Heart size={12} fill={comment.my_like ? C.orange : 'none'} />
                        {comment.like_count > 0 && comment.like_count}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input */}
            <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #e7edf8', marginTop: 10, display: 'flex', gap: 10 }}>
              <textarea
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                placeholder="Add a comment… (Enter to send)"
                rows={2}
                style={{ flex: 1, border: '1px solid #dae2fd', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, fontFamily: C.sans, resize: 'none', outline: 'none', background: C.surfaceLow, lineHeight: 1.5 }}
              />
              <button
                onClick={handleSendComment}
                disabled={!newMsg.trim() || sending}
                style={{
                  background: newMsg.trim() ? C.primary : '#dae2fd',
                  border: 'none', borderRadius: 10, padding: '0 16px',
                  cursor: newMsg.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s', flexShrink: 0,
                }}
              >
                <Send size={16} color="#fff" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
