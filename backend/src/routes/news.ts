import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';
import { sseManager } from '../lib/sseManager';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { data: posts, error } = await supabase
    .from('news_posts')
    .select(`*, author:users!user_id(id, name, team)`)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) { res.status(500).json({ error: error.message }); return; }

  const { data: reactions } = await supabase
    .from('reactions')
    .select('post_id, type, user_id');

  const reactionMap: Record<string, { celebrate: number; comment: number; mine: string | null }> = {};
  for (const r of reactions || []) {
    if (!reactionMap[r.post_id]) reactionMap[r.post_id] = { celebrate: 0, comment: 0, mine: null };
    if (r.type === 'celebrate') reactionMap[r.post_id].celebrate++;
    if (r.type === 'comment') reactionMap[r.post_id].comment++;
    if (r.user_id === req.user!.id) reactionMap[r.post_id].mine = r.type;
  }

  const enriched = (posts || []).map(p => ({
    ...p,
    celebrate_count: reactionMap[p.id]?.celebrate ?? 0,
    comment_count: reactionMap[p.id]?.comment ?? 0,
    my_reaction: reactionMap[p.id]?.mine ?? null,
  }));

  res.json(enriched);
});

router.post('/:id/react', requireAuth, async (req: Request, res: Response) => {
  const { type } = req.body;
  if (!['celebrate', 'comment'].includes(type)) {
    res.status(400).json({ error: 'type must be celebrate or comment' });
    return;
  }

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('post_id', req.params.id)
    .eq('user_id', req.user!.id)
    .eq('type', type)
    .single();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
    res.json({ toggled: false });
    return;
  }

  await supabase.from('reactions').insert({ post_id: req.params.id, user_id: req.user!.id, type });

  // Notify the post author
  const { data: post } = await supabase.from('news_posts').select('user_id, title').eq('id', req.params.id).single();
  if (post && post.user_id !== req.user!.id) {
    const action = type === 'celebrate' ? 'celebrated' : 'commented on';
    const { data: notif } = await supabase.from('notifications').insert({
      user_id: post.user_id,
      type: `reaction_${type}`,
      message: `${req.user!.name} ${action} your post: ${post.title}`,
    }).select().single();
    if (notif) sseManager.emit(post.user_id, notif);
  }

  res.json({ toggled: true });
});

export default router;
