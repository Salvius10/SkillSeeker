import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';
import { notify } from '../lib/notify';

const router = Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_COMMENT = 2000;

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const { data: posts, error, count } = await supabase
    .from('news_posts')
    .select(`*, author:users!user_id(id, name, team)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) { console.error('[news.GET]', error); res.status(500).json({ error: 'Could not load news feed' }); return; }

  const postIds = (posts || []).map(p => p.id);

  const [{ data: reactions }, { data: commentRows }] = await Promise.all([
    supabase.from('reactions').select('post_id, type, user_id').in('post_id', postIds),
    supabase.from('news_post_comments').select('post_id').in('post_id', postIds),
  ]);

  const commentCountMap: Record<string, number> = {};
  for (const c of commentRows || []) {
    commentCountMap[c.post_id] = (commentCountMap[c.post_id] ?? 0) + 1;
  }

  const reactionMap: Record<string, { celebrate: number; mine: string | null }> = {};
  for (const r of reactions || []) {
    if (!reactionMap[r.post_id]) reactionMap[r.post_id] = { celebrate: 0, mine: null };
    if (r.type === 'celebrate') reactionMap[r.post_id].celebrate++;
    if (r.user_id === req.user!.id && r.type === 'celebrate') reactionMap[r.post_id].mine = r.type;
  }

  const enriched = (posts || []).map(p => ({
    ...p,
    celebrate_count: reactionMap[p.id]?.celebrate ?? 0,
    comment_count: commentCountMap[p.id] ?? 0,
    my_reaction: reactionMap[p.id]?.mine ?? null,
  }));

  res.json({ posts: enriched, total: count ?? 0, limit, offset, hasMore: offset + limit < (count ?? 0) });
});

router.post('/:id/react', requireAuth, async (req: Request, res: Response) => {
  const { type } = req.body;
  if (type !== 'celebrate') {
    res.status(400).json({ error: 'type must be celebrate' }); return;
  }

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('post_id', req.params.id)
    .eq('user_id', req.user!.id)
    .eq('type', type)
    .maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
    res.json({ toggled: false }); return;
  }

  await supabase.from('reactions').insert({ post_id: req.params.id, user_id: req.user!.id, type });

  const { data: post } = await supabase.from('news_posts').select('user_id, title').eq('id', req.params.id).single();
  if (post && post.user_id !== req.user!.id) {
    await notify(post.user_id, 'reaction_celebrate', `${req.user!.name} celebrated your post: ${post.title}`);
  }

  res.json({ toggled: true });
});

router.get('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('news_post_comments')
    .select(`*, author:users!user_id(id, name, team)`)
    .eq('post_id', req.params.id)
    .order('created_at', { ascending: true });
  if (error) { console.error('[news.GET comments]', error); res.status(500).json({ error: 'Could not load comments' }); return; }
  res.json(data || []);
});

router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: 'message is required' }); return; }
  if (message.trim().length > MAX_COMMENT) { res.status(400).json({ error: `Comment must be ${MAX_COMMENT} characters or fewer` }); return; }

  const { data, error } = await supabase
    .from('news_post_comments')
    .insert({ post_id: req.params.id, user_id: req.user!.id, message: message.trim() })
    .select(`*, author:users!user_id(id, name, team)`)
    .single();
  if (error) { console.error('[news.POST comment]', error); res.status(500).json({ error: 'Could not post comment' }); return; }

  const { data: post } = await supabase.from('news_posts').select('user_id, title').eq('id', req.params.id).single();
  if (post && post.user_id !== req.user!.id) {
    await notify(post.user_id, 'reaction_comment', `${req.user!.name} commented on your post: ${post.title}`);
  }

  res.status(201).json(data);
});

export default router;
