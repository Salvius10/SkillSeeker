import { useState, useEffect, useRef } from 'react';
import { getSubmissionMessages, postSubmissionMessage, resubmitChallenge } from '../api/client';
import type { SubmissionMessage } from '../types';
import { useAuth } from '../context/AuthContext';

const TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  github_url: 'GitHub',
  presentation_url: 'Presentation',
  folder_url: 'Folder',
};

const FORMAT_OPTIONS = [
  { key: 'text', label: '✍ Text' },
  { key: 'github_url', label: ' GitHub URL' },
  { key: 'presentation_url', label: '📊 Presentation' },
  { key: 'folder_url', label: '📁 Folder URL' },
] as const;

interface Props {
  submissionId: string;
  challengeTitle: string;
  submissionType: string;
  status: 'pending' | 'approved' | 'rejected';
  onClose: () => void;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: '#f0f3fa', color: '#5e6d8a', label: 'In Review' },
  approved: { bg: '#e6f7ef', color: '#1f8a5b', label: 'Approved ✓' },
  rejected: { bg: '#fee7e0', color: '#d32f2f', label: 'Revision Requested' },
};

export default function SubmissionThread({ submissionId, challengeTitle, submissionType, status, onClose }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SubmissionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);
  const [resubmitContent, setResubmitContent] = useState('');
  const [resubmitType, setResubmitType] = useState(submissionType || 'text');
  const [resubmitting, setResubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSubmissionMessages(submissionId).then(setMessages).finally(() => setLoading(false));
  }, [submissionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const msg = await postSubmissionMessage(submissionId, newMsg.trim());
      setMessages(prev => [...prev, msg]);
      setNewMsg('');
    } finally {
      setSending(false);
    }
  };

  const handleResubmit = async () => {
    if (!resubmitContent.trim()) return;
    setResubmitting(true);
    try {
      await resubmitChallenge(submissionId, resubmitContent.trim(), resubmitType);
      onClose();
    } finally {
      setResubmitting(false);
    }
  };

  const st = STATUS_STYLE[status];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'backdropIn 0.2s ease' }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 620, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e7edf8', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{challengeTitle}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <span style={{ background: '#f0f3ff', color: '#1a00d9', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{TYPE_LABELS[submissionType] ?? submissionType}</span>
              <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{st.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f6f8fc', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', color: '#69748c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 20 }}>Loading thread…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 20 }}>No messages yet. Start the conversation below.</div>
          ) : (
            messages.map(m => {
              const isOwn = m.user_id === user?.id;
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {m.is_admin && <span style={{ background: '#fee7e0', color: '#d32f2f', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5 }}>Admin</span>}
                    <span style={{ fontSize: 11, color: '#9aa3b5' }}>{m.author?.name ?? 'Unknown'}</span>
                    <span style={{ fontSize: 10, color: '#c0c7d6' }}>·</span>
                    <span style={{ fontSize: 11, color: '#9aa3b5' }}>{new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ maxWidth: '80%', background: m.is_admin ? '#f0f3ff' : isOwn ? '#f6f8fc' : '#fff', border: '1px solid #e7edf8', borderRadius: isOwn ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '10px 14px', fontSize: 14, lineHeight: 1.5, color: '#2a2f3d' }}>
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 22px', borderTop: '1px solid #e7edf8' }}>
          {/* Resubmit panel for rejected submissions */}
          {status === 'rejected' && (
            <div style={{ marginBottom: 14 }}>
              {!showResubmit ? (
                <button onClick={() => setShowResubmit(true)} style={{ background: '#1a00d9', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                  Revise &amp; Resubmit
                </button>
              ) : (
                <div style={{ background: '#f0f3ff', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a00d9' }}>Submit your revision</div>
                  {/* Format selector */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {FORMAT_OPTIONS.map(f => (
                      <button key={f.key} onClick={() => setResubmitType(f.key)} style={{ padding: '6px 12px', borderRadius: 7, border: `2px solid ${resubmitType === f.key ? '#1a00d9' : '#e2e8f4'}`, background: resubmitType === f.key ? '#fff' : '#f9fafc', color: resubmitType === f.key ? '#1a00d9' : '#69748c', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{f.label}</button>
                    ))}
                  </div>
                  <textarea value={resubmitContent} onChange={e => setResubmitContent(e.target.value)} placeholder={resubmitType === 'text' ? 'Describe your revised solution…' : 'Paste your URL here…'} rows={3} style={{ border: '1px solid #e2e8f4', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleResubmit} disabled={resubmitting || !resubmitContent.trim()} style={{ background: '#1a00d9', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: resubmitting ? 'not-allowed' : 'pointer', opacity: resubmitting ? 0.7 : 1 }}>
                      {resubmitting ? 'Submitting…' : 'Submit revision'}
                    </button>
                    <button onClick={() => setShowResubmit(false)} style={{ background: '#f6f8fc', color: '#69748c', border: '1px solid #e7edf8', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message input */}
          <div style={{ display: 'flex', gap: 10 }}>
            <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Add a message… (Enter to send)" rows={2} style={{ flex: 1, border: '1px solid #e2e8f4', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={sendMessage} disabled={sending || !newMsg.trim()} style={{ background: '#1a00d9', color: '#fff', border: 'none', borderRadius: 10, padding: '0 18px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, flexShrink: 0 }}>
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
