import { useState, useEffect } from 'react';
import { getNews, reactToPost } from '../api/client';
import type { NewsPost } from '../types';
import { useAuth } from '../context/AuthContext';

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

const AVATAR_COLORS = ['#1a00d9', '#2a6fdb', '#1f8a5b', '#9b59b6', '#e67e22', '#c0392b'];
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

  if (loading) return <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {posts.length === 0 && <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>No posts yet. Complete a challenge to be the first!</div>}
      {posts.map(post => {
        const authorName = post.author?.name ?? 'Unknown';
        const isMe = post.user_id === user?.id;
        return (
          <div key={post.id} style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 15, padding: 20, boxShadow: '0 1px 2px rgba(26,0,217,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColor(authorName), color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(authorName)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{authorName}{isMe ? ' (you)' : ''}</div>
                <div style={{ fontSize: 12, color: '#9aa3b5' }}>{timeAgo(post.created_at)}</div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eaf2ff', padding: '6px 11px', borderRadius: 9 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#5e9eff' }}>+{post.points_awarded}</span>
              </div>
            </div>

            {post.points_awarded >= 400 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8, background: '#fe6e06', color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.4px', padding: '3px 9px', borderRadius: 7, textTransform: 'uppercase' }}>🏆 Winner</div>
            )}

            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>{post.title}</h3>
            {post.content && <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.6, color: '#566080' }}>{post.content}</p>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: '1px solid #eef2fa' }}>
              <button onClick={() => react(post.id, 'celebrate')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: post.my_reaction === 'celebrate' ? '#fe6e06' : '#f6f8fc', color: post.my_reaction === 'celebrate' ? '#fff' : '#69748c', border: post.my_reaction === 'celebrate' ? 'none' : '1px solid #e7edf8', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                🎉 Celebrate · {post.celebrate_count}
              </button>
              <button onClick={() => react(post.id, 'comment')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#f6f8fc', color: '#69748c', border: '1px solid #e7edf8', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                💬 Comment · {post.comment_count}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
