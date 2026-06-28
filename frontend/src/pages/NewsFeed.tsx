import { useState, useEffect, useRef } from 'react';
import { Rocket, Trophy, TrendingUp, Send, Zap, Star, ArrowUpRight } from 'lucide-react';
import { getNews, reactToPost, getNewsComments, postNewsComment } from '../api/client';
import type { NewsPost, NewsComment } from '../types';
import { useAuth } from '../context/AuthContext';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
  purple: '#8b5cf6',
  surface: '#ffffff',
  surfaceLow: '#f2f3ff',
  border: 'rgba(26,0,217,0.08)',
  text: '#0e1523',
  textSec: '#3d4460',
  textMuted: '#8891a8',
  success: '#10b981',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const CARD_SHADOW = '0 0 0 1px rgba(26,0,217,0.05), 0 2px 8px rgba(26,0,217,0.04), 0 8px 28px rgba(26,0,217,0.05)';
const CARD_SHADOW_HOVER = '0 0 0 1px rgba(26,0,217,0.14), 0 6px 16px rgba(26,0,217,0.08), 0 20px 48px rgba(26,0,217,0.1)';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

function mkInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const PALETTE = ['#1a00d9', '#413ff4', '#10b981', '#8b5cf6', '#fe6e06', '#06b6d4', '#e11d48', '#0891b2'];
function avatarColor(seed: string) {
  let h = 0;
  for (const c of seed) h = c.charCodeAt(0) + h * 31;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function isNewChallenge(post: NewsPost) {
  return post.points_awarded === 0 && !!post.challenge_id;
}

/** Infer a category label + color from a post title for trending display. */
function inferCategory(title: string): { label: string; color: string; bg: string } {
  const t = title.toLowerCase();
  if (t.includes('cloud') || t.includes('infra') || t.includes('aws') || t.includes('deploy') || t.includes('k8s') || t.includes('kubernetes') || t.includes('docker'))
    return { label: 'DevOps', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' };
  if (t.includes('security') || t.includes('auth') || t.includes('patch') || t.includes('vuln'))
    return { label: 'Security', color: '#e11d48', bg: 'rgba(225,29,72,0.08)' };
  if (t.includes('cod') || t.includes('api') || t.includes('script') || t.includes('develop') || t.includes('build'))
    return { label: 'Dev', color: C.purple, bg: 'rgba(139,92,246,0.1)' };
  if (t.includes('data') || t.includes('sql') || t.includes('database') || t.includes('analyt'))
    return { label: 'Data', color: C.success, bg: 'rgba(16,185,129,0.1)' };
  if (t.includes('monitor') || t.includes('observ') || t.includes('log') || t.includes('alert'))
    return { label: 'Ops', color: '#0891b2', bg: 'rgba(8,145,178,0.1)' };
  return { label: 'General', color: C.primary, bg: 'rgba(26,0,217,0.07)' };
}

/** Generate a short insight blurb for achievement posts based on the title. */
function generateBlurb(title: string): string {
  const raw = title.includes('completed:') ? title.split('completed:')[1]?.trim() ?? title : title;
  const t = raw.toLowerCase();
  if (t.includes('cloud') && (t.includes('cost') || t.includes('optim'))) return 'Delivered measurable cloud cost savings for the org';
  if (t.includes('infra') || t.includes('provisio')) return 'Automated infrastructure provisioning end-to-end';
  if (t.includes('security') || t.includes('vulnerab') || t.includes('patch')) return 'Strengthened the security posture across systems';
  if (t.includes('performance') || t.includes('latency') || t.includes('speed')) return 'Reduced latency and improved system throughput';
  if (t.includes('automat') || t.includes('pipeline') || t.includes('ci') || t.includes('cd')) return 'Automated a critical deployment workflow';
  if (t.includes('monitor') || t.includes('observ') || t.includes('alert') || t.includes('log')) return 'Improved production visibility and alerting coverage';
  if (t.includes('docker') || t.includes('kubernetes') || t.includes('container')) return 'Containerized a key service for better scalability';
  if (t.includes('database') || t.includes('sql') || t.includes('query') || t.includes('index')) return 'Optimized database performance and query efficiency';
  if (t.includes('api') || t.includes('endpoint') || t.includes('integration')) return 'Shipped a new API integration to production';
  if (t.includes('test') || t.includes('coverage') || t.includes('qa')) return 'Raised test coverage across critical code paths';
  if (t.includes('document') || t.includes('runbook') || t.includes('wiki')) return 'Improved team documentation and knowledge sharing';
  if (t.includes('backup') || t.includes('disaster') || t.includes('recovery')) return 'Hardened disaster recovery procedures';
  if (t.includes('network') || t.includes('dns') || t.includes('load balanc')) return 'Improved network reliability and routing';
  if (t.includes('scala') || t.includes('capacity') || t.includes('resize')) return 'Scaled infrastructure to handle increased demand';
  return 'Delivered a high-impact engineering solution';
}

/** Generate up to N pseudo-random reactor avatar colors from a post ID seed. */
function reactorColors(postId: string, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < Math.min(count, 4); i++) {
    out.push(avatarColor(postId + i));
  }
  return out;
}

/** Rank change indicator for trending sidebar. */
function rankIndicator(i: number, post: NewsPost): { symbol: string; color: string } {
  const total = post.celebrate_count + post.comment_count;
  if (i === 0 && total > 4) return { symbol: '🔥', color: C.orange };
  if (post.celebrate_count > post.comment_count * 2) return { symbol: '↑', color: C.success };
  if (post.comment_count > post.celebrate_count * 2) return { symbol: '→', color: '#06b6d4' };
  if (i === 0) return { symbol: '↑', color: C.success };
  if (i === 2) return { symbol: '↓', color: C.textMuted };
  return { symbol: '→', color: C.textMuted };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const color = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${color}bb)`,
      color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.32),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.75)',
      boxShadow: `0 1px 6px ${color}44`,
    }}>
      {mkInitials(name)}
    </div>
  );
}

function AvatarStack({ postId, count }: { postId: string; count: number }) {
  if (count === 0) return null;
  const colors = reactorColors(postId, count);
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {colors.map((color, i) => (
        <div
          key={i}
          style={{
            width: 20, height: 20, borderRadius: '50%',
            background: `linear-gradient(135deg, ${color}, ${color}bb)`,
            border: '2px solid #fff',
            marginLeft: i > 0 ? -6 : 0,
            zIndex: 10 - i,
            position: 'relative',
            boxShadow: `0 1px 4px ${color}44`,
          }}
        />
      ))}
      {count > 4 && (
        <div style={{
          width: 20, height: 20, borderRadius: '50%', background: C.surfaceLow,
          border: '2px solid #fff', marginLeft: -6, zIndex: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, color: C.textMuted, fontFamily: C.mono,
        }}>+{count - 4}</div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function NewsFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const PAGE = 20;
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, NewsComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState<string | null>(null);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const commentBottomRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const load = async () => {
    try {
      const res = await getNews(0, PAGE);
      setPosts(res.posts ?? res);
      setHasMore(res.hasMore ?? false);
      setOffset(PAGE);
    } finally { setLoading(false); }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await getNews(offset, PAGE);
      setPosts(prev => [...prev, ...(res.posts ?? [])]);
      setHasMore(res.hasMore ?? false);
      setOffset(o => o + PAGE);
    } finally { setLoadingMore(false); }
  };

  useEffect(() => { load(); }, []);

  const celebrate = async (postId: string) => {
    await reactToPost(postId, 'celebrate');
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const wasOn = p.my_reaction === 'celebrate';
      return { ...p, celebrate_count: wasOn ? p.celebrate_count - 1 : p.celebrate_count + 1, my_reaction: wasOn ? null : 'celebrate' };
    }));
  };

  const toggleComments = async (postId: string) => {
    if (expandedPostId === postId) { setExpandedPostId(null); return; }
    setExpandedPostId(postId);
    if (!postComments[postId]) {
      setLoadingComments(postId);
      try {
        const data = await getNewsComments(postId);
        setPostComments(prev => ({ ...prev, [postId]: data }));
      } finally { setLoadingComments(null); }
    }
    setTimeout(() => { commentBottomRefs.current[postId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
  };

  const submitComment = async (postId: string) => {
    const msg = (commentInputs[postId] ?? '').trim();
    if (!msg || sendingComment === postId) return;
    setSendingComment(postId);
    try {
      const comment = await postNewsComment(postId, msg);
      setPostComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), comment] }));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
      setTimeout(() => { commentBottomRefs.current[postId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
    } finally { setSendingComment(null); }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', color: C.textMuted, padding: 80 }}>
      <div style={{ width: 30, height: 30, border: '2.5px solid rgba(26,0,217,0.1)', borderTop: `2.5px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
      <div style={{ fontSize: 13 }}>Loading feed…</div>
    </div>
  );

  const todayStr = new Date().toDateString();
  const todayPosts = posts.filter(p => new Date(p.created_at).toDateString() === todayStr);
  const totalReactionsToday = todayPosts.reduce((sum, p) => sum + p.celebrate_count, 0);
  const newChallengeCount = posts.filter(p => isNewChallenge(p)).length;
  const trending = [...posts]
    .sort((a, b) => (b.celebrate_count + b.comment_count) - (a.celebrate_count + a.comment_count))
    .slice(0, 3);

  return (
    <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* ── Live gradient top bar ── */}
      <div style={{
        height: 3, borderRadius: 2, marginBottom: 26,
        background: 'linear-gradient(90deg, #1a00d9 0%, #8b5cf6 35%, #fe6e06 65%, #1a00d9 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 4s linear infinite',
        opacity: 0.8,
      }} />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', maxWidth: 1060, margin: '0 auto' }}>

        {/* ── Main feed ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── Activity summary bar ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              {
                icon: <TrendingUp size={16} />,
                val: todayPosts.length,
                label: "Today's posts",
                color: C.primary,
                bg: 'linear-gradient(135deg, rgba(26,0,217,0.07) 0%, rgba(26,0,217,0.03) 100%)',
                border: 'rgba(26,0,217,0.12)',
                pulse: false,
              },
              {
                icon: <Rocket size={16} />,
                val: newChallengeCount,
                label: 'New challenges',
                color: C.purple,
                bg: 'linear-gradient(135deg, rgba(139,92,246,0.09) 0%, rgba(139,92,246,0.04) 100%)',
                border: 'rgba(139,92,246,0.16)',
                pulse: newChallengeCount > 0,
              },
              {
                icon: <Star size={16} />,
                val: totalReactionsToday,
                label: 'Reactions today',
                color: C.orange,
                bg: 'linear-gradient(135deg, rgba(254,110,6,0.08) 0%, rgba(254,110,6,0.03) 100%)',
                border: 'rgba(254,110,6,0.16)',
                pulse: false,
              },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 14, padding: '16px 18px',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Background watermark icon */}
                <div style={{ position: 'absolute', right: 14, bottom: 10, opacity: 0.06, color: s.color }}>
                  {s.icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ color: s.color, opacity: 0.75, display: 'flex' }}>{s.icon}</div>
                  {s.pulse && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, animation: 'pulse-dot 1.5s ease-in-out infinite', boxShadow: `0 0 0 3px ${s.color}33` }} />
                  )}
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, color: s.color, fontFamily: C.mono, letterSpacing: '-1px', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── No posts at all ── */}
          {posts.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '64px 40px',
              background: 'linear-gradient(135deg, rgba(26,0,217,0.03), rgba(139,92,246,0.04))',
              border: '1px solid rgba(26,0,217,0.08)', borderRadius: 20,
              boxShadow: CARD_SHADOW,
            }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🚀</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 6, letterSpacing: '-0.4px' }}>No posts yet</div>
              <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 28, lineHeight: 1.6 }}>Complete a challenge to be the first to show up in the feed!</div>
            </div>
          )}

          {/* ── No completions today (but posts exist) ── */}
          {posts.length > 0 && todayPosts.length === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 20,
              background: 'linear-gradient(135deg, rgba(26,0,217,0.04), rgba(139,92,246,0.05))',
              border: '1px dashed rgba(26,0,217,0.14)', borderRadius: 16,
              padding: '20px 24px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 36, flexShrink: 0 }}>⚡</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 3 }}>Be the first to complete a challenge today</div>
                <div style={{ fontSize: 13, color: C.textMuted }}>No completions posted yet today — grab a challenge and make your mark on the feed.</div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: C.primary, fontWeight: 700, cursor: 'default', opacity: 0.8 }}>
                <Zap size={13} /> Browse challenges
              </div>
            </div>
          )}

          {/* ── Post cards ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.map(post => {
              const authorName = post.author?.name ?? 'Unknown';
              const isMe = post.user_id === user?.id;
              const isChallenge = isNewChallenge(post);
              const isHighValue = !isChallenge && post.points_awarded >= 400;
              const isCelebrated = post.my_reaction === 'celebrate';
              const isExpanded = expandedPostId === post.id;
              const isHovered = hoveredPostId === post.id;
              const comments = postComments[post.id] ?? [];

              const accentColor = isChallenge ? C.primary : isHighValue ? C.orange : C.purple;

              // Full-border accent per category (no side-stripe)
              const borderNormal = isChallenge
                ? 'rgba(26,0,217,0.1)'
                : isHighValue
                ? 'rgba(254,110,6,0.22)'
                : 'rgba(139,92,246,0.14)';
              const borderActive = isChallenge
                ? 'rgba(26,0,217,0.2)'
                : isHighValue
                ? 'rgba(254,110,6,0.38)'
                : 'rgba(139,92,246,0.26)';
              const cardBackground = isHighValue
                ? 'linear-gradient(180deg, rgba(254,110,6,0.025) 0%, #ffffff 72px)'
                : C.surface;

              // Blurb only for achievement posts
              const blurb = !isChallenge ? generateBlurb(post.title) : null;

              const totalReactions = post.celebrate_count + post.comment_count;

              return (
                <div
                  key={post.id}
                  onMouseEnter={() => setHoveredPostId(post.id)}
                  onMouseLeave={() => setHoveredPostId(null)}
                  style={{
                    background: cardBackground,
                    border: `1px solid ${isHovered ? borderActive : borderNormal}`,
                    borderRadius: 15,
                    overflow: 'hidden',
                    boxShadow: isHovered ? CARD_SHADOW_HOVER : CARD_SHADOW,
                    transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                    transition: 'transform 0.18s, box-shadow 0.22s, border-color 0.18s',
                  }}
                >
                  <div style={{ padding: '18px 20px 16px' }}>

                    {/* ── Row 1: type badge + points badge ── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: isChallenge ? 'rgba(26,0,217,0.07)' : isHighValue ? 'rgba(254,110,6,0.1)' : 'rgba(139,92,246,0.09)',
                        color: accentColor, fontSize: 10, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 20, fontFamily: C.mono, letterSpacing: '0.05em',
                        border: `1px solid ${isChallenge ? 'rgba(26,0,217,0.1)' : isHighValue ? 'rgba(254,110,6,0.18)' : 'rgba(139,92,246,0.15)'}`,
                      }}>
                        {isChallenge ? <Rocket size={9} /> : <Trophy size={9} />}
                        {isChallenge ? 'NEW CHALLENGE' : 'ACHIEVEMENT'}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isHighValue && (
                          <span style={{
                            background: 'linear-gradient(135deg, #e85c00, #fe6e06)',
                            color: '#fff', fontSize: 9.5, fontWeight: 800,
                            letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 20,
                            fontFamily: C.mono, boxShadow: '0 2px 8px rgba(254,110,6,0.32)',
                          }}>🏆 HIGH VALUE</span>
                        )}
                        {!isChallenge && post.points_awarded > 0 && (
                          <span style={{
                            background: 'linear-gradient(135deg, #1a00d9, #413ff4)',
                            color: '#fff', fontWeight: 800, fontSize: 12.5,
                            padding: '4px 13px', borderRadius: 20, fontFamily: C.mono,
                            boxShadow: '0 2px 8px rgba(26,0,217,0.28)',
                            letterSpacing: '-0.2px',
                          }}>+{post.points_awarded} pts</span>
                        )}
                        {isChallenge && (
                          <span style={{
                            background: 'rgba(26,0,217,0.07)', color: C.primary,
                            fontWeight: 700, fontSize: 10, padding: '3px 10px',
                            borderRadius: 20, fontFamily: C.mono, border: '1px solid rgba(26,0,217,0.12)',
                          }}>OPEN</span>
                        )}
                      </div>
                    </div>

                    {/* ── Row 2: author ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Avatar name={authorName} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text, letterSpacing: '-0.1px' }}>
                          {authorName}
                          {isMe && (
                            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.primary, background: '#eaedff', padding: '1px 6px', borderRadius: 8, marginLeft: 7, fontWeight: 700 }}>you</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 1 }}>
                          {post.author?.team && <span style={{ marginRight: 6 }}>{post.author.team} ·</span>}
                          {timeAgo(post.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* ── Row 3: title + blurb + content ── */}
                    <h3 style={{ margin: '0 0 5px', fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px', color: C.text, lineHeight: 1.3 }}>
                      {post.title}
                    </h3>
                    {blurb && (
                      <div style={{ fontSize: 12.5, color: accentColor, fontWeight: 600, marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5, opacity: 0.85 }}>
                        <ArrowUpRight size={12} />
                        {blurb}
                      </div>
                    )}
                    {post.content && (
                      <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.7, color: C.textSec }}>{post.content}</p>
                    )}

                    {/* ── Row 4: avatar stack + engagement summary ── */}
                    {totalReactions > 0 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        paddingBottom: 12, marginBottom: 0,
                        borderBottom: '1px solid rgba(26,0,217,0.06)',
                      }}>
                        <AvatarStack postId={post.id} count={post.celebrate_count} />
                        <span style={{ fontSize: 12, color: C.textMuted }}>
                          {post.celebrate_count > 0 && `🎉 ${post.celebrate_count}`}
                          {post.celebrate_count > 0 && post.comment_count > 0 && <span style={{ margin: '0 5px', opacity: 0.4 }}>·</span>}
                          {post.comment_count > 0 && (
                            <button
                              onClick={() => toggleComments(post.id)}
                              style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: C.textMuted, cursor: 'pointer', fontFamily: C.sans, textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
                            >
                              💬 {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
                            </button>
                          )}
                        </span>
                      </div>
                    )}

                    {/* ── Row 5: action buttons ── */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      paddingTop: totalReactions > 0 ? 8 : 12,
                      borderTop: totalReactions === 0 ? '1px solid rgba(26,0,217,0.06)' : 'none',
                      gap: 2,
                    }}>
                      <button
                        onClick={() => celebrate(post.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 7,
                          flex: 1, justifyContent: 'center',
                          background: isCelebrated ? 'linear-gradient(135deg, #e85c00, #fe6e06)' : 'transparent',
                          color: isCelebrated ? '#fff' : C.textSec,
                          border: 'none', borderRadius: 8, padding: '8px 10px',
                          fontSize: 13, fontWeight: 600, fontFamily: C.sans, cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: isCelebrated ? '0 2px 10px rgba(254,110,6,0.3)' : 'none',
                        }}
                        onMouseEnter={e => { if (!isCelebrated) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(254,110,6,0.07)'; }}
                        onMouseLeave={e => { if (!isCelebrated) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <span>🎉</span>
                        <span>Celebrate</span>
                        {post.celebrate_count > 0 && (
                          <span style={{ fontFamily: C.mono, fontSize: 11.5, opacity: isCelebrated ? 0.9 : 0.55, fontWeight: 700 }}>{post.celebrate_count}</span>
                        )}
                      </button>

                      <div style={{ width: 1, height: 18, background: 'rgba(26,0,217,0.08)', flexShrink: 0 }} />

                      <button
                        onClick={() => toggleComments(post.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 7,
                          flex: 1, justifyContent: 'center',
                          background: isExpanded ? 'rgba(26,0,217,0.07)' : 'transparent',
                          color: isExpanded ? C.primary : C.textSec,
                          border: 'none', borderRadius: 8, padding: '8px 10px',
                          fontSize: 13, fontWeight: 600, fontFamily: C.sans, cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26,0,217,0.05)'; }}
                        onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <span>💬</span>
                        <span>Comment</span>
                        {post.comment_count > 0 && (
                          <span style={{ fontFamily: C.mono, fontSize: 11.5, opacity: isExpanded ? 1 : 0.55, fontWeight: 700 }}>{post.comment_count}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ── Inline comment thread ── */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 18px', borderTop: '1px solid rgba(26,0,217,0.06)' }}>
                      <div style={{ paddingTop: 16 }}>
                        {loadingComments === post.id ? (
                          <div style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, padding: '12px 0' }}>Loading…</div>
                        ) : comments.length === 0 ? (
                          <div style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, padding: '10px 0 16px' }}>No comments yet — be the first!</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                            {comments.map(c => {
                              const cName = c.author?.name ?? 'Unknown';
                              return (
                                <div key={c.id} style={{ display: 'flex', gap: 9 }}>
                                  <Avatar name={cName} size={28} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      background: 'rgba(26,0,217,0.03)',
                                      border: '1px solid rgba(26,0,217,0.07)',
                                      borderRadius: '0 12px 12px 12px',
                                      padding: '8px 12px',
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 3 }}>
                                        <span style={{ fontWeight: 700, fontSize: 12.5, color: C.text }}>{cName}</span>
                                        {c.author?.team && (
                                          <span style={{ fontSize: 10, color: C.textMuted, fontFamily: C.mono }}>{c.author.team}</span>
                                        )}
                                      </div>
                                      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.textSec, wordBreak: 'break-word' }}>{c.message}</p>
                                    </div>
                                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, paddingLeft: 2 }}>{timeAgo(c.created_at)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Comment input */}
                        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
                          {user && <Avatar name={user.name} size={28} />}
                          <div style={{ flex: 1, position: 'relative' }}>
                            <textarea
                              value={commentInputs[post.id] ?? ''}
                              onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(post.id); } }}
                              placeholder="Write a comment… (Enter to send)"
                              rows={1}
                              style={{
                                width: '100%', border: '1px solid rgba(26,0,217,0.12)',
                                borderRadius: 20, padding: '9px 46px 9px 14px',
                                fontSize: 13.5, fontFamily: C.sans, resize: 'none', outline: 'none',
                                background: 'rgba(26,0,217,0.02)', lineHeight: 1.5,
                                boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s', color: C.text,
                              }}
                              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(26,0,217,0.28)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,0,217,0.07)'; }}
                              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(26,0,217,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                            <button
                              onClick={() => submitComment(post.id)}
                              disabled={!(commentInputs[post.id] ?? '').trim() || sendingComment === post.id}
                              style={{
                                position: 'absolute', right: 8, bottom: 8,
                                background: (commentInputs[post.id] ?? '').trim()
                                  ? 'linear-gradient(135deg, #1a00d9, #413ff4)'
                                  : 'rgba(26,0,217,0.1)',
                                border: 'none', borderRadius: '50%', width: 28, height: 28,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: (commentInputs[post.id] ?? '').trim() ? 'pointer' : 'default',
                                transition: 'all 0.15s', flexShrink: 0,
                                boxShadow: (commentInputs[post.id] ?? '').trim() ? '0 2px 8px rgba(26,0,217,0.25)' : 'none',
                              }}
                            >
                              <Send size={12} color="#fff" />
                            </button>
                          </div>
                        </div>
                        <div ref={el => { commentBottomRefs.current[post.id] = el; }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  width: '100%', marginTop: 12,
                  background: 'transparent',
                  border: '1px dashed rgba(26,0,217,0.18)',
                  borderRadius: 12, padding: '12px 0',
                  fontSize: 13, fontWeight: 600, color: C.primary,
                  cursor: loadingMore ? 'default' : 'pointer',
                  fontFamily: C.sans, transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!loadingMore) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26,0,217,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {loadingMore ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid rgba(26,0,217,0.2)', borderTop: `2px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Loading…</>
                ) : 'Load more posts'}
              </button>
            )}
          </div>
        </div>

        {/* ── Trending sidebar ── */}
        <div style={{ width: 252, flexShrink: 0, position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Trending card */}
          <div style={{
            background: C.surface, border: '1px solid rgba(26,0,217,0.07)',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(26,0,217,0.05)',
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 18px 12px',
              background: 'linear-gradient(135deg, rgba(26,0,217,0.05), rgba(139,92,246,0.04))',
              borderBottom: '1px solid rgba(26,0,217,0.07)',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <TrendingUp size={14} color={C.primary} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: '-0.1px' }}>Trending Now</span>
              <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: C.success, boxShadow: `0 0 6px ${C.success}88`, animation: 'pulse-dot 2s ease-in-out infinite' }} />
            </div>

            {trending.length === 0 ? (
              <div style={{ padding: '20px 18px', fontSize: 13, color: C.textMuted }}>No reactions yet.</div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {trending.map((p, i) => {
                  const cat = inferCategory(p.title);
                  const rank = rankIndicator(i, p);
                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: '10px 18px',
                        borderBottom: i < trending.length - 1 ? '1px solid rgba(26,0,217,0.05)' : 'none',
                        transition: 'background 0.15s', cursor: 'default',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(26,0,217,0.02)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {/* Rank + indicator */}
                        <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 28 }}>
                          <div style={{ fontWeight: 900, fontSize: 14, fontFamily: C.mono, color: i === 0 ? C.orange : C.textMuted, lineHeight: 1 }}>
                            #{i + 1}
                          </div>
                          <div style={{ fontSize: 11, color: rank.color, marginTop: 2, lineHeight: 1 }}>{rank.symbol}</div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }} title={p.title}>
                            {p.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 9.5, fontWeight: 700, color: cat.color,
                              background: cat.bg, border: `1px solid ${cat.color}33`,
                              padding: '2px 7px', borderRadius: 20, fontFamily: C.mono,
                            }}>{cat.label}</span>
                            {!isNewChallenge(p) && p.points_awarded > 0 && (
                              <span style={{ fontSize: 10.5, fontWeight: 800, color: C.primary, fontFamily: C.mono }}>
                                +{p.points_awarded}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5, fontFamily: C.mono }}>
                            🎉 {p.celebrate_count} · 💬 {p.comment_count}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* View all link */}
                <div style={{ padding: '10px 18px 4px', borderTop: '1px solid rgba(26,0,217,0.05)' }}>
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'none', border: 'none', padding: 0,
                      fontSize: 12, fontWeight: 600, color: C.primary,
                      cursor: 'pointer', fontFamily: C.sans, opacity: 0.75,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75'; }}
                  >
                    View all activity <ArrowUpRight size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick stats sidebar card */}
          <div style={{
            background: 'linear-gradient(145deg, #1a00d9 0%, #2c1fff 100%)',
            borderRadius: 16, padding: '18px 18px',
            boxShadow: '0 6px 24px rgba(26,0,217,0.25)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 160px 120px at 130px 20px, rgba(255,255,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(180,185,255,0.8)', letterSpacing: '0.1em', fontFamily: C.mono, marginBottom: 12, textTransform: 'uppercase' }}>Feed Stats</div>
            {[
              { label: 'Total posts', val: posts.length },
              { label: 'Achievements', val: posts.filter(p => !isNewChallenge(p)).length },
              { label: 'Open challenges', val: posts.filter(p => isNewChallenge(p)).length },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: C.mono }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
