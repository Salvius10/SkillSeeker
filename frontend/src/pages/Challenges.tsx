import { useState, useEffect } from 'react';
import { Search, Clock, Flame, Code, FlaskConical, Sparkles, SearchX } from 'lucide-react';
import { getChallenges, submitChallenge, getMyPicks, pickChallenge, unpickChallenge } from '../api/client';
import type { Challenge } from '../types';
import SubmissionThread from '../components/SubmissionThread';
import ChallengeModal from '../components/ChallengeModal';
import { useAuth } from '../context/AuthContext';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
  bg: '#f5f6ff',
  surface: '#ffffff',
  surfaceLow: '#f2f3ff',
  border: 'rgba(26,0,217,0.09)',
  text: '#0e1523',
  textSec: '#3d4460',
  textMuted: '#8891a8',
  success: '#10b981',
  danger: '#d32f2f',
  coding: '#8b5cf6',
  research: '#06b6d4',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const CARD_SHADOW = '0 0 0 1px rgba(26,0,217,0.06), 0 2px 6px rgba(26,0,217,0.04), 0 8px 24px rgba(26,0,217,0.04)';
const CARD_SHADOW_HOVER = '0 0 0 1px rgba(26,0,217,0.14), 0 4px 12px rgba(26,0,217,0.08), 0 20px 48px rgba(26,0,217,0.1)';

function catConfig(cat: string): { color: string; bg: string; icon: React.ReactNode } {
  const c = cat.toLowerCase();
  if (c.includes('cod') || c.includes('dev') || c.includes('eng')) return { color: C.coding, bg: 'rgba(139,92,246,0.09)', icon: <Code size={10} /> };
  if (c.includes('res') || c.includes('ux') || c.includes('design')) return { color: C.research, bg: 'rgba(6,182,212,0.09)', icon: <FlaskConical size={10} /> };
  return { color: C.primary, bg: 'rgba(26,0,217,0.07)', icon: <Sparkles size={10} /> };
}

const STATUS_TAG: Record<string, { bg: string; fg: string; label: string }> = {
  urgent:   { bg: 'rgba(211,47,47,0.08)',  fg: C.danger,   label: 'URGENT' },
  open:     { bg: 'rgba(26,0,217,0.07)',   fg: C.primary,  label: 'OPEN' },
  pending:  { bg: 'rgba(254,110,6,0.09)',  fg: C.orange,   label: 'IN REVIEW' },
  approved: { bg: 'rgba(16,185,129,0.09)', fg: C.success,  label: 'APPROVED' },
  rejected: { bg: 'rgba(211,47,47,0.08)', fg: C.danger,   label: 'REVISION' },
  closed:   { bg: 'rgba(100,100,120,0.07)', fg: '#767588', label: 'CLOSED' },
  taken:    { bg: 'rgba(254,110,6,0.09)',  fg: C.orange,   label: 'TAKEN' },
};

function tagKey(c: Challenge) {
  if (c.my_submission_status === 'pending') return 'pending';
  if (c.my_submission_status === 'approved') return 'approved';
  if (c.my_submission_status === 'rejected') return 'rejected';
  if (c.priority === 'urgent' && c.status === 'open') return 'urgent';
  if (c.status === 'open') return 'open';
  return 'closed';
}

function tierPoints(basePoints: number, approvedCount: number): number {
  const m = approvedCount === 0 ? 1 : approvedCount === 1 ? 0.75 : approvedCount === 2 ? 0.5 : 0.25;
  return Math.round(basePoints * m);
}

export default function Challenges() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const [filter, setFilter] = useState('all');
  const [minPoints, setMinPoints] = useState(0);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myPicks, setMyPicks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [modalChallenge, setModalChallenge] = useState<Challenge | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadStatus, setThreadStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [threadType, setThreadType] = useState('text');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const serverFilter = (filter === 'all' || filter === 'inProgress') ? undefined : filter;
      const [data, picks] = await Promise.all([
        getChallenges({ filter: serverFilter, minPoints: minPoints || undefined }),
        getMyPicks(),
      ]);
      setChallenges(data);
      setMyPicks(picks);
    } catch {
      setLoadError('Failed to load challenges. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter, minPoints]);

  useEffect(() => {
    if (modalChallenge) {
      const updated = challenges.find(c => c.id === modalChallenge.id);
      if (updated) setModalChallenge(updated);
    }
  }, [challenges]);

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

  const urgentChallenges = challenges.filter(c => c.priority === 'urgent');
  const maxUrgentPts = urgentChallenges.length > 0 ? Math.max(...urgentChallenges.map(c => c.points)) : 0;

  const handlePick = async (challengeId: string) => {
    await pickChallenge(challengeId);
    setMyPicks(p => [...p, challengeId]);
    load();
  };

  const handleUnpick = async (challengeId: string) => {
    await unpickChallenge(challengeId);
    setMyPicks(p => p.filter(id => id !== challengeId));
    load();
  };

  const openThread = (c: Challenge) => {
    if (!c.my_submission_id) return;
    setThreadId(c.my_submission_id);
    setThreadTitle(c.title);
    setThreadStatus(c.my_submission_status as 'pending' | 'approved' | 'rejected');
    setThreadType(c.my_submission_type ?? 'text');
  };

  const filterTabStyle = (active: boolean, accent?: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 15px', borderRadius: 20, fontSize: 12.5, fontFamily: C.sans,
    cursor: 'pointer',
    border: active ? 'none' : '1px solid rgba(26,0,217,0.1)',
    background: active ? (accent ?? C.primary) : C.surface,
    color: active ? '#fff' : C.textSec,
    transition: 'all 0.15s',
    boxShadow: active ? `0 3px 12px ${accent ? 'rgba(254,110,6,0.35)' : 'rgba(26,0,217,0.28)'}` : '0 1px 3px rgba(26,0,217,0.04)',
    letterSpacing: '-0.1px',
    fontWeight: active ? 700 : 600,
  });

  return (
    <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* Hero */}
      {counts.open > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #08006e 0%, #1200b0 30%, #1a00d9 65%, #2c1fff 100%)',
          borderRadius: 18, padding: '22px 28px', marginBottom: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 8px 32px rgba(26,0,217,0.28), 0 1px 0 rgba(255,255,255,0.04) inset',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 500px 300px at 20% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 27, fontWeight: 900, color: '#fff', marginBottom: 5, letterSpacing: '-0.7px', lineHeight: 1.2 }}>
              {counts.open} open {counts.open === 1 ? 'opportunity' : 'opportunities'} available
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.58)', fontWeight: 400 }}>Pick a challenge, submit your work, earn points</div>
          </div>
          <div style={{ display: 'flex', gap: 28, flexShrink: 0, position: 'relative' }}>
            {[
              { val: counts.inProgress, label: 'IN REVIEW', color: '#fe6e06' },
              { val: counts.urgent, label: 'URGENT', color: 'rgba(255,255,255,0.5)' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: s.color, fontFamily: C.mono, letterSpacing: '-1.5px', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: C.mono, letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + range */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, color: C.textMuted, pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search challenges…"
            style={{
              width: '100%', height: 42, border: '1px solid rgba(26,0,217,0.09)',
              borderRadius: 11, padding: '0 14px 0 40px', fontSize: 13.5,
              fontFamily: C.sans, outline: 'none', background: C.surface,
              color: C.text, boxShadow: '0 1px 4px rgba(26,0,217,0.04)',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(26,0,217,0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,0,217,0.07)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(26,0,217,0.09)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(26,0,217,0.04)'; }}
          />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px',
          background: C.surface, border: '1px solid rgba(26,0,217,0.09)', borderRadius: 11,
          minWidth: 190, boxShadow: '0 1px 4px rgba(26,0,217,0.04)',
        }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, fontFamily: C.mono, letterSpacing: '0.06em' }}>MIN PTS</span>
          <input type="range" min={0} max={500} step={50} value={minPoints} onChange={e => setMinPoints(Number(e.target.value))} style={{ width: 90, accentColor: C.primary }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: C.orange, minWidth: 32, fontFamily: C.mono }}>{minPoints}</span>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={filterTabStyle(filter === 'all')}>
          All <span style={{ fontFamily: C.mono, fontSize: 10.5, opacity: 0.75 }}>{counts.all}</span>
        </button>
        <button onClick={() => setFilter('open')} style={filterTabStyle(filter === 'open')}>
          Open <span style={{ fontFamily: C.mono, fontSize: 10.5, opacity: 0.75 }}>{counts.open}</span>
        </button>
        <button onClick={() => setFilter('inProgress')} style={filterTabStyle(filter === 'inProgress')}>
          In Progress <span style={{ fontFamily: C.mono, fontSize: 10.5, opacity: 0.75 }}>{counts.inProgress}</span>
        </button>
        <button onClick={() => setFilter('urgent')} style={filterTabStyle(filter === 'urgent', '#fe6e06')}>
          <Flame size={11} /> Urgent <span style={{ fontFamily: C.mono, fontSize: 10.5, opacity: 0.75 }}>{counts.urgent}</span>
        </button>
      </div>

      {/* Urgent banner */}
      {urgentChallenges.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #e85c00 0%, #fe6e06 50%, #ff8838 100%)',
          borderRadius: 13, padding: '14px 20px', marginBottom: 22,
          display: 'flex', alignItems: 'center', gap: 12, color: '#fff',
          boxShadow: '0 6px 20px rgba(254,110,6,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse-dot 1.5s ease-in-out infinite', boxShadow: '0 0 0 4px rgba(255,255,255,0.25)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 14.5, letterSpacing: '-0.3px' }}>LIVE — Urgent challenge open</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 1 }}>Submit before the deadline to maximize your points!</div>
          </div>
          <span style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', padding: '5px 13px', borderRadius: 20, fontFamily: C.mono, flexShrink: 0 }}>
            UP TO {maxUrgentPts} PTS
          </span>
        </div>
      )}

      {loadError && (
        <div style={{ background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 12, padding: '12px 18px', fontSize: 13.5, color: '#d32f2f', marginBottom: 16 }}>{loadError}</div>
      )}

      {/* Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', color: C.textMuted, padding: 80 }}>
          <div style={{ width: 32, height: 32, border: `2.5px solid rgba(26,0,217,0.1)`, borderTop: `2.5px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
          <div style={{ fontSize: 13, color: C.textMuted }}>Loading challenges…</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((c, index) => {
            const tk = tagKey(c);
            const tag = STATUS_TAG[tk] ?? STATUS_TAG.closed;
            const cat = catConfig(c.category);
            const isPicked = myPicks.includes(c.id);
            const hasSub = !!c.my_submission_status;
            const isHovered = hoveredId === c.id;
            const approvedCount = c.approved_count ?? 0;
            const nextPts = tierPoints(c.points, approvedCount);

            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                aria-label={`${c.title} — ${c.points} points`}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setModalChallenge(c)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setModalChallenge(c); } }}
                style={{
                  background: C.surface,
                  border: `1px solid ${isHovered ? 'rgba(26,0,217,0.18)' : 'rgba(26,0,217,0.07)'}`,
                  borderRadius: 15,
                  padding: '18px 22px',
                  boxShadow: isHovered ? CARD_SHADOW_HOVER : CARD_SHADOW,
                  display: 'flex', gap: 18,
                  transition: 'border-color 0.18s, box-shadow 0.22s, transform 0.18s',
                  animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
                  animationDelay: `${Math.min(index, 5) * 45}ms`,
                  animationFillMode: 'both',
                  cursor: 'pointer',
                  transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cat.bg, color: cat.color, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', padding: '3px 9px 3px 7px', borderRadius: 20, fontFamily: C.mono }}>
                      {cat.icon} {c.category}
                    </span>
                    <span style={{ display: 'inline-block', background: tag.bg, color: tag.fg, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 20, fontFamily: C.mono }}>
                      {tag.label}
                    </span>
                    {isPicked && !hasSub && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: C.success, background: 'rgba(16,185,129,0.08)', padding: '3px 8px', borderRadius: 20, fontFamily: C.mono }}>
                        ✓ Picked
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: '0 0 5px', fontSize: 17, fontWeight: 800, letterSpacing: '-0.45px', color: C.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{c.title}</h3>
                  <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.55, color: C.textSec, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{c.description}</p>

                  <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: C.textMuted }}>
                    {c.due_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} /> Due {new Date(c.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span style={{ fontFamily: C.mono }}>{approvedCount} completed</span>
                    <span style={{ fontFamily: C.mono }}>{c.entry_count ?? 0} entries</span>
                  </div>
                </div>

                {/* Right column */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, minWidth: 88 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: C.orange, fontFamily: C.mono, letterSpacing: '-1px', lineHeight: 1 }}>{nextPts}</div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: C.mono, letterSpacing: '0.08em', marginTop: 3 }}>
                      {approvedCount > 0 ? `PTS (${Math.round(nextPts / c.points * 100)}%)` : 'PTS'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, fontFamily: C.sans, transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: isHovered ? '5px 12px' : '5px 0',
                    background: isHovered ? C.primary : 'transparent',
                    color: isHovered ? '#fff' : C.textMuted,
                    borderRadius: 20,
                    boxShadow: isHovered ? '0 2px 10px rgba(26,0,217,0.25)' : 'none',
                  }}>
                    {isHovered ? 'Open' : '···'}
                  </span>
                </div>
              </div>
            );
          })}

          {visible.length === 0 && (
            <div style={{ textAlign: 'center', color: C.textMuted, padding: 72, background: C.surface, border: '1px solid rgba(26,0,217,0.07)', borderRadius: 16, boxShadow: CARD_SHADOW }}>
              <SearchX size={32} style={{ color: 'rgba(26,0,217,0.15)', marginBottom: 14 }} />
              <div style={{ fontWeight: 700, color: C.textSec, marginBottom: 4 }}>No challenges match your filters</div>
              <div style={{ fontSize: 13, marginBottom: 18 }}>Try a different filter or search term</div>
              {(search || filter !== 'all' || minPoints > 0) && (
                <button
                  onClick={() => { setSearch(''); setFilter('all'); setMinPoints(0); }}
                  style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer', boxShadow: '0 2px 10px rgba(26,0,217,0.25)' }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {modalChallenge && (
        <ChallengeModal
          challenge={modalChallenge}
          currentUserId={currentUserId}
          isPicked={myPicks.includes(modalChallenge.id)}
          hasSubmission={!!modalChallenge.my_submission_status}
          submissionStatus={modalChallenge.my_submission_status}
          submissionId={modalChallenge.my_submission_id}
          submissionType={modalChallenge.my_submission_type}
          onPick={() => handlePick(modalChallenge.id)}
          onUnpick={() => handleUnpick(modalChallenge.id)}
          onSubmitSuccess={() => { setModalChallenge(null); load(); }}
          onViewSubmissionThread={() => { openThread(modalChallenge); setModalChallenge(null); }}
          onClose={() => setModalChallenge(null)}
          submitChallengeFn={(id, content, type) => submitChallenge(id, content, type)}
        />
      )}

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
