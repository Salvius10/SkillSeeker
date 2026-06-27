import { useState, useEffect } from 'react';
import { Search, Clock, X, Flame, Target, Code, FlaskConical, Sparkles, SearchX } from 'lucide-react';
import { getChallenges, submitChallenge, getMyPicks, pickChallenge, unpickChallenge } from '../api/client';
import type { Challenge } from '../types';
import SubmissionThread from '../components/SubmissionThread';

// ── Design tokens ────────────────────────────────────────────────
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
  coding: '#8b5cf6',
  research: '#06b6d4',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const CARD_SHADOW = '0 4px 12px rgba(26,0,217,0.05)';
const CARD_SHADOW_HOVER = '0 8px 24px rgba(26,0,217,0.10)';

// ── Category config ───────────────────────────────────────────────
function catConfig(cat: string): { color: string; bg: string; icon: React.ReactNode } {
  const c = cat.toLowerCase();
  if (c.includes('cod') || c.includes('dev') || c.includes('eng')) return { color: C.coding, bg: 'rgba(139,92,246,0.10)', icon: <Code size={11} /> };
  if (c.includes('res') || c.includes('ux') || c.includes('design')) return { color: C.research, bg: 'rgba(6,182,212,0.10)', icon: <FlaskConical size={11} /> };
  return { color: C.primary, bg: 'rgba(26,0,217,0.08)', icon: <Sparkles size={11} /> };
}

// ── Status tag config ─────────────────────────────────────────────
const TAG: Record<string, { bg: string; fg: string; label: string }> = {
  urgent:   { bg: '#fee7e0', fg: '#d32f2f',  label: 'URGENT' },
  open:     { bg: '#eaedff', fg: C.primary,  label: 'OPEN' },
  pending:  { bg: '#f2f3ff', fg: '#454556',  label: 'IN REVIEW' },
  approved: { bg: 'rgba(16,185,129,0.12)', fg: '#10b981', label: 'APPROVED' },
  rejected: { bg: '#fee7e0', fg: '#d32f2f',  label: 'REVISION' },
  closed:   { bg: '#f2f3ff', fg: '#767588',  label: 'CLOSED' },
};

function tagKey(c: Challenge) {
  if (c.priority === 'urgent') return 'urgent';
  if (c.my_submission_status === 'pending') return 'pending';
  if (c.my_submission_status === 'approved') return 'approved';
  if (c.my_submission_status === 'rejected') return 'rejected';
  if (c.status === 'open') return 'open';
  return 'closed';
}

const FORMAT_OPTIONS = [
  { key: 'text', label: '✍ Text' },
  { key: 'github_url', label: ' GitHub URL' },
  { key: 'presentation_url', label: '📊 Presentation' },
  { key: 'folder_url', label: '📁 Folder URL' },
] as const;

interface Props {
  filter: string;
  setFilter: (f: string) => void;
  minPoints: number;
  setMinPoints: (n: number) => void;
}

export default function Challenges({ filter, setFilter, minPoints, setMinPoints }: Props) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myPicks, setMyPicks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitId, setSubmitId] = useState<string | null>(null);
  const [submitContent, setSubmitContent] = useState('');
  const [submitType, setSubmitType] = useState<'text' | 'github_url' | 'presentation_url' | 'folder_url'>('text');
  const [submitting, setSubmitting] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadStatus, setThreadStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [threadType, setThreadType] = useState('text');

  const load = async () => {
    setLoading(true);
    try {
      const serverFilter = (filter === 'all' || filter === 'inProgress') ? undefined : filter;
      const [data, picks] = await Promise.all([
        getChallenges({ filter: serverFilter, minPoints: minPoints || undefined }),
        getMyPicks(),
      ]);
      setChallenges(data);
      setMyPicks(picks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter, minPoints]);

  const visible = challenges.filter(c => {
    if (filter === 'inProgress' && c.my_submission_status !== 'pending') return false;
    return !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
  });

  const counts = {
    all: challenges.length,
    open: challenges.filter(c => c.status === 'open').length,
    inProgress: challenges.filter(c => c.my_submission_status === 'pending').length,
    urgent: challenges.filter(c => c.priority === 'urgent').length,
  };

  const handlePick = async (challengeId: string) => {
    setPickError(null);
    try {
      await pickChallenge(challengeId);
      setMyPicks(p => [...p, challengeId]);
    } catch (e: unknown) {
      setPickError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not pick challenge. Try again.');
    }
  };

  const handleUnpick = async (challengeId: string) => {
    try {
      await unpickChallenge(challengeId);
      setMyPicks(p => p.filter(id => id !== challengeId));
    } catch {}
  };

  const handleConfirmSubmit = async (c: Challenge) => {
    if (!submitContent.trim()) {
      setSubmitError('Please add your submission content before submitting.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await submitChallenge(c.id, submitContent, submitType);
      setSubmitId(null);
      setSubmitContent('');
      setSubmitType('text');
      load();
    } catch (e: unknown) {
      setSubmitError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openThread = (c: Challenge) => {
    if (!c.my_submission_id) return;
    setThreadId(c.my_submission_id);
    setThreadTitle(c.title);
    setThreadStatus(c.my_submission_status as 'pending' | 'approved' | 'rejected');
    setThreadType(c.my_submission_type ?? 'text');
  };

  const urgentChallenges = challenges.filter(c => c.priority === 'urgent');
  const maxUrgentPts = urgentChallenges.length > 0 ? Math.max(...urgentChallenges.map(c => c.points)) : 0;

  const filterTabStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 14px',
    borderRadius: 24,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: C.sans,
    cursor: 'pointer',
    border: active ? 'none' : '1px solid #dae2fd',
    background: active ? C.primary : C.surface,
    color: active ? '#fff' : C.textSec,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* Hero / matched opportunities banner */}
      {counts.open > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #0f0099 0%, #1a00d9 60%, #2219f5 100%)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(26,0,217,0.2)' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: '-0.3px' }}>
              {counts.open} open {counts.open === 1 ? 'opportunity' : 'opportunities'} available
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.72)' }}>Pick a challenge, submit your work, earn points</div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fe6e06', fontFamily: C.mono }}>{counts.inProgress}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: C.mono }}>IN REVIEW</div>
            </div>
            <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.15)', alignSelf: 'center' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#a2a4ff', fontFamily: C.mono }}>{counts.urgent}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: C.mono }}>URGENT</div>
            </div>
          </div>
        </div>
      )}

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: 14, color: C.textMuted, pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search challenges, skills, topics…"
            style={{ width: '100%', height: 42, border: '1px solid #dae2fd', borderRadius: 10, padding: '0 14px 0 40px', fontSize: 14, fontFamily: C.sans, outline: 'none', background: C.surface, color: C.text, transition: 'border-color 0.15s' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', background: C.surface, border: '1px solid #dae2fd', borderRadius: 10, minWidth: 180 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, fontFamily: C.mono, letterSpacing: '0.05em' }}>MIN</span>
          <input type="range" min={0} max={500} step={50} value={minPoints} onChange={e => setMinPoints(Number(e.target.value))} style={{ width: 100, accentColor: C.primary }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, minWidth: 36, fontFamily: C.mono }}>{minPoints}</span>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={filterTabStyle(filter === 'all')}>All <span style={{ fontFamily: C.mono, fontSize: 11 }}>{counts.all}</span></button>
        <button onClick={() => setFilter('open')} style={filterTabStyle(filter === 'open')}>Open <span style={{ fontFamily: C.mono, fontSize: 11 }}>{counts.open}</span></button>
        <button onClick={() => setFilter('inProgress')} style={filterTabStyle(filter === 'inProgress')}>In Progress <span style={{ fontFamily: C.mono, fontSize: 11 }}>{counts.inProgress}</span></button>
        <button onClick={() => setFilter('urgent')} style={{ ...filterTabStyle(filter === 'urgent'), background: filter === 'urgent' ? '#fe6e06' : C.surface, border: filter === 'urgent' ? 'none' : '1px solid rgba(254,110,6,0.3)', color: filter === 'urgent' ? '#fff' : '#fe6e06' }}>
          <Flame size={12} /> Urgent <span style={{ fontFamily: C.mono, fontSize: 11 }}>{counts.urgent}</span>
        </button>
      </div>

      {/* Urgent live banner */}
      {urgentChallenges.length > 0 && (
        <div style={{ background: 'linear-gradient(90deg, #fe6e06 0%, #ff8c38 100%)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, color: '#fff', boxShadow: '0 4px 16px rgba(254,110,6,0.25)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse-dot 1.5s ease-in-out infinite', boxShadow: '0 0 0 3px rgba(255,255,255,0.3)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.2px' }}>LIVE — Urgent challenge open</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 1 }}>Submit before the deadline to maximize your points!</div>
          </div>
          <span style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', padding: '4px 12px', borderRadius: 20, fontFamily: C.mono }}>
            UP TO {maxUrgentPts} PTS
          </span>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>
          <div style={{ width: 36, height: 36, border: `3px solid #dae2fd`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13 }}>Loading challenges…</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map((c, index) => {
            const tk = tagKey(c);
            const tag = TAG[tk] ?? TAG.closed;
            const cat = catConfig(c.category);
            const isPicked = myPicks.includes(c.id);
            const hasSub = !!c.my_submission_status;
            const isHovered = hoveredId === c.id;

            return (
              <div
                key={c.id}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: C.surface,
                  border: `1px solid ${isHovered ? C.primary : '#dae2fd'}`,
                  borderRadius: 14,
                  padding: '18px 20px',
                  boxShadow: isHovered ? CARD_SHADOW_HOVER : CARD_SHADOW,
                  display: 'flex',
                  gap: 16,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
                  animationDelay: `${Math.min(index, 5) * 50}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, flexWrap: 'wrap' }}>
                    {/* Category badge */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cat.bg, color: cat.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 9px 3px 7px', borderRadius: 20, fontFamily: C.mono }}>
                      {cat.icon}{c.category}
                    </span>
                    {/* Status chip */}
                    <span style={{ display: 'inline-block', background: tag.bg, color: tag.fg, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 20, fontFamily: C.mono }}>
                      {tag.label}
                    </span>
                    {isPicked && !hasSub && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: C.success, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 20, fontFamily: C.mono }}>
                        <Target size={10} /> Picked
                      </span>
                    )}
                  </div>

                  {/* Title + description */}
                  <h3 style={{ margin: '0 0 6px', fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.2px', color: C.text, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{c.title}</h3>
                  <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.65, color: C.textSec }}>{c.description}</p>

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: C.textMuted }}>
                    {c.due_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />Due {new Date(c.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span style={{ fontFamily: C.mono }}>{c.entry_count ?? 0} entries</span>
                  </div>

                  {/* Inline submit form */}
                  {submitId === c.id && isPicked && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, animation: 'expandDown 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {FORMAT_OPTIONS.map(f => (
                          <button key={f.key} type="button" onClick={() => setSubmitType(f.key)} style={{ padding: '6px 12px', borderRadius: 8, border: `2px solid ${submitType === f.key ? C.primary : '#dae2fd'}`, background: submitType === f.key ? '#f2f3ff' : C.surface, color: submitType === f.key ? C.primary : C.textSec, fontSize: 12, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}>{f.label}</button>
                        ))}
                      </div>
                      <textarea value={submitContent} onChange={e => setSubmitContent(e.target.value)} placeholder={submitType === 'text' ? 'Describe your solution, link your PR or write-up…' : 'Paste your URL here…'} rows={4} style={{ border: '1px solid #dae2fd', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontFamily: C.sans, resize: 'vertical', outline: 'none', background: '#fafbff' }} />
                      {submitError && (
                        <div style={{ fontSize: 12.5, color: '#d32f2f', background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 8, padding: '8px 12px' }}>{submitError}</div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleConfirmSubmit(c)} disabled={submitting} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,0,217,0.2)' }}>
                          {submitting ? 'Submitting…' : 'Confirm Submit'}
                        </button>
                        <button onClick={() => { setSubmitId(null); setSubmitError(null); }} style={{ background: '#f2f3ff', color: C.textSec, border: '1px solid #dae2fd', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <X size={12} />Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, minWidth: 100 }}>
                  {/* Points badge */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.orange, fontFamily: C.mono, letterSpacing: '-0.5px' }}>{c.points}</div>
                    <div style={{ fontSize: 10.5, color: C.textMuted, fontFamily: C.mono, letterSpacing: '0.04em' }}>POINTS</div>
                  </div>

                  {/* Action button */}
                  {hasSub ? (
                    <button onClick={() => openThread(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: tag.bg, color: tag.fg, border: `1px solid ${tag.fg}22`, borderRadius: 24, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}>
                      {tag.label} · Thread
                    </button>
                  ) : c.status === 'closed' ? (
                    <button disabled style={{ display: 'inline-flex', alignItems: 'center', background: '#f2f3ff', color: C.textMuted, border: '1px solid #dae2fd', borderRadius: 24, padding: '7px 14px', fontSize: 12, fontWeight: 700, fontFamily: C.sans, cursor: 'default' }}>Closed</button>
                  ) : isPicked ? (
                    <button onClick={() => { setSubmitId(c.id); setSubmitContent(''); setSubmitType('text'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.primary, color: '#fff', border: 'none', borderRadius: 24, padding: '7px 16px', fontSize: 12.5, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,0,217,0.25)' }}>
                      Submit
                    </button>
                  ) : (
                    <>
                      <button onClick={() => handlePick(c.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: 24, padding: '7px 16px', fontSize: 12.5, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}>
                        Pick
                      </button>
                      {pickError && <div style={{ fontSize: 11, color: '#d32f2f', maxWidth: 100, textAlign: 'right', lineHeight: 1.3 }}>{pickError}</div>}
                    </>
                  )}

                  {isPicked && !hasSub && (
                    <button onClick={() => handleUnpick(c.id)} style={{ fontSize: 11, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.sans, textDecoration: 'underline', padding: 0 }}>Unpick</button>
                  )}
                </div>
              </div>
            );
          })}
          {visible.length === 0 && (
            <div style={{ textAlign: 'center', color: C.textMuted, padding: 60, background: C.surface, border: '1px solid #dae2fd', borderRadius: 14 }}>
              <SearchX size={36} style={{ color: '#dae2fd', marginBottom: 12 }} />
              <div style={{ fontWeight: 700, color: C.textSec }}>No challenges match your filters</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Try a different filter or search term</div>
              {(search || filter !== 'all' || minPoints > 0) && (
                <button
                  onClick={() => { setSearch(''); setFilter('all'); setMinPoints(0); }}
                  style={{ marginTop: 14, background: C.primary, color: '#fff', border: 'none', borderRadius: 20, padding: '7px 18px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Thread modal */}
      {threadId && (
        <SubmissionThread
          submissionId={threadId}
          challengeTitle={threadTitle}
          submissionType={threadType}
          status={threadStatus}
          onClose={() => { setThreadId(null); load(); }}
        />
      )}
    </div>
  );
}
