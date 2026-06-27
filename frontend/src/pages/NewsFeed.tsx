import { useState, useEffect } from 'react';
import { Rocket, Trophy, TrendingUp } from 'lucide-react';
import { getNews, reactToPost } from '../api/client';
import type { NewsPost } from '../types';
import { useAuth } from '../context/AuthContext';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
  surface: '#ffffff',
  surfaceLow: '#f2f3ff',
  border: '#dae2fd',
  text: '#131b2e',
  textSec: '#454556',
  textMuted: '#767588',
  success: '#10b981',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_PALETTE = ['#1a00d9', '#413ff4', '#10b981', '#8b5cf6', '#fe6e06', '#06b6d4'];
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + hash * 31;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function isNewChallenge(post: NewsPost) {
  return post.points_awarded === 0 && !!post.challenge_id;
}

export default function NewsFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const data = await getNews(); setPosts(data); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const react = async (postId: string, type: 'celebrate' | 'comment') => {
    await reactToPost(postId, type);
    load();
  };

  if (loading) return (
    <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>
      <div style={{ width: 36, height: 36, border: `3px solid #dae2fd`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
    </div>
  );

  const todayStr = new Date().toDateString();
  const todayPosts = posts.filter(p => new Date(p.created_at).toDateString() === todayStr);
  const totalReactionsToday = todayPosts.reduce((sum, p) => sum + p.celebrate_count + p.comment_count, 0);
  const newChallengeCount = posts.filter(p => isNewChallenge(p)).length;

  const trending = [...posts]
    .sort((a, b) => (b.celebrate_count + b.comment_count) - (a.celebrate_count + a.comment_count))
    .slice(0, 3);

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', maxWidth: 1020, margin: '0 auto', animation: 'fadeIn 0.2s ease' }}>
      {/* Main feed */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { icon: <TrendingUp size={15} color={C.primary} />, val: todayPosts.length, label: "Today's posts", color: C.primary },
            { icon: <Rocket size={15} color='#8b5cf6' />, val: newChallengeCount, label: 'New challenges', color: '#8b5cf6' },
            { icon: <span style={{ fontSize: 13 }}>🎉</span>, val: totalReactionsToday, label: 'Reactions today', color: C.orange },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: '1px solid #dae2fd', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, display: 'flex', gap: 7, alignItems: 'center', boxShadow: '0 2px 6px rgba(26,0,217,0.04)' }}>
              {s.icon}
              <span style={{ color: s.color, fontSize: 16, fontWeight: 900, fontFamily: C.mono }}>{s.val}</span>
              <span style={{ color: C.textMuted, fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, background: C.surface, border: '1px solid #dae2fd', borderRadius: 16, color: C.textMuted }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📰</div>
            <div style={{ fontWeight: 700, color: C.textSec }}>No posts yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Complete a challenge to be the first!</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(post => {
            const authorName = post.author?.name ?? 'Unknown';
            const isMe = post.user_id === user?.id;
            const isChallenge = isNewChallenge(post);
            const accentColor = isChallenge ? C.primary : C.orange;
            const badgeBg = isChallenge ? '#eaedff' : '#fff3e8';
            const badgeLabel = isChallenge ? 'New Challenge' : 'Achievement';
            const BadgeIcon = isChallenge ? Rocket : Trophy;

            return (
              <div key={post.id} style={{
                background: C.surface,
                border: '1px solid #dae2fd',
                borderLeft: `3px solid ${accentColor}`,
                borderRadius: 14,
                padding: '18px 20px',
                boxShadow: '0 4px 12px rgba(26,0,217,0.04)',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: badgeBg, color: accentColor, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: C.mono, letterSpacing: '0.03em' }}>
                    <BadgeIcon size={11} />{badgeLabel.toUpperCase()}
                  </span>
                  {!isChallenge && post.points_awarded > 0 && (
                    <span style={{ background: C.surfaceLow, color: C.primary, fontWeight: 800, fontSize: 13, padding: '3px 10px', borderRadius: 20, fontFamily: C.mono }}>+{post.points_awarded} pts</span>
                  )}
                  {isChallenge && (
                    <span style={{ background: '#eaedff', color: C.primary, fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 20, fontFamily: C.mono }}>OPEN</span>
                  )}
                </div>

                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(authorName), color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(authorName)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{authorName}{isMe ? <span style={{ fontFamily: C.mono, fontSize: 10, color: C.primary, background: '#eaedff', padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>you</span> : ''}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted }}>{timeAgo(post.created_at)}</div>
                  </div>
                </div>

                {post.points_awarded >= 400 && !isChallenge && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8, background: C.orange, color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', fontFamily: C.mono }}>
                    🏆 High Value
                  </div>
                )}

                <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', color: C.text }}>{post.title}</h3>
                {post.content && <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.65, color: C.textSec }}>{post.content}</p>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid #f2f3ff' }}>
                  <button
                    onClick={() => react(post.id, 'celebrate')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: post.my_reaction === 'celebrate' ? C.orange : C.surfaceLow, color: post.my_reaction === 'celebrate' ? '#fff' : C.textSec, border: post.my_reaction === 'celebrate' ? 'none' : '1px solid #dae2fd', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer', transition: 'all 0.15s' }}
                  >
                    🎉 <span style={{ fontFamily: C.mono }}>{post.celebrate_count}</span>
                  </button>
                  <button
                    onClick={() => react(post.id, 'comment')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surfaceLow, color: C.textSec, border: '1px solid #dae2fd', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}
                  >
                    💬 <span style={{ fontFamily: C.mono }}>{post.comment_count}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trending sidebar */}
      <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 0 }}>
        <div style={{ background: C.surface, border: '1px solid #dae2fd', borderRadius: 14, padding: 20, boxShadow: '0 4px 12px rgba(26,0,217,0.04)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', fontFamily: C.mono, marginBottom: 12 }}>TRENDING</div>
          {trending.length === 0 && <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>No reactions yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {trending.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 900, fontSize: 16, color: i === 0 ? C.orange : C.textMuted, flexShrink: 0, lineHeight: 1.3, fontFamily: C.mono }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }} title={p.title}>{p.title}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, fontFamily: C.mono }}>🎉 {p.celebrate_count} · 💬 {p.comment_count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
