import { useState } from 'react';
import {
  X, Clock, Flame, Code, FlaskConical, Sparkles,
  CheckCircle2, XCircle, MessageCircle, Target, AlertTriangle,
} from 'lucide-react';
import type { Challenge } from '../types';

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

export default function ChallengeModal({
  challenge, currentUserId, isPicked, hasSubmission,
  submissionStatus, submissionId, submissionType,
  onPick, onUnpick, onSubmitSuccess, onViewSubmissionThread, onClose,
  submitChallengeFn,
}: Props) {
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitContent, setSubmitContent] = useState('');
  const [submitType, setSubmitType] = useState<'text' | 'github_url' | 'presentation_url' | 'folder_url'>('text');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const isPickedByOther = !!(challenge.picked_by && challenge.picked_by.id !== currentUserId);
  const isPickedByAnyone = !!challenge.picked_by;

  const handlePick = async () => {
    setPickError('');
    setPicking(true);
    try { await onPick(); } catch (e: unknown) {
      setPickError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not pick. Try again.');
    } finally { setPicking(false); }
  };

  const handleUnpick = async () => {
    setPickError('');
    setPicking(true);
    try { await onUnpick(); } catch (e: unknown) {
      setPickError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not unpick. Try again.');
    } finally { setPicking(false); }
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

      </div>
    </div>
  );
}
