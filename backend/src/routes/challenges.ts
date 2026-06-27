import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { sseManager } from '../lib/sseManager';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { filter, minPoints, category } = req.query;

  let query = supabase
    .from('challenges')
    .select(`
      *,
      entry_count:submissions!challenge_id(count),
      creator:users!created_by(name)
    `)
    .order('created_at', { ascending: false });

  if (minPoints) query = query.gte('points', Number(minPoints));
  if (category) query = query.eq('category', category);
  if (filter === 'urgent') query = query.eq('priority', 'urgent');
  else if (filter === 'open') query = query.eq('status', 'open');
  else if (filter === 'closed') query = query.eq('status', 'closed');

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Flatten Supabase aggregate: entry_count comes back as [{ count: n }]
  const flatten = (rows: typeof data) =>
    (rows || []).map(c => ({
      ...c,
      entry_count: Array.isArray(c.entry_count) ? (c.entry_count[0]?.count ?? 0) : (c.entry_count ?? 0),
    }));

  // Fetch all picks to enrich challenges with picker info
  const { data: pickRows } = await supabase
    .from('picks')
    .select('challenge_id, picker:users!user_id(id, name)');

  const pickMap: Record<string, { id: string; name: string }> = {};
  for (const p of (pickRows || [])) {
    if (p.picker && typeof p.picker === 'object' && !Array.isArray(p.picker)) {
      pickMap[p.challenge_id] = p.picker as { id: string; name: string };
    }
  }

  const withPicks = (rows: ReturnType<typeof flatten>) =>
    rows.map(c => ({ ...c, picked_by: pickMap[c.id] || null }));

  // If employee, attach their own submission status, id, and type
  if (req.user!.role === 'employee') {
    const { data: subs } = await supabase
      .from('submissions')
      .select('id, challenge_id, status, submission_type')
      .eq('user_id', req.user!.id);

    const subMap = Object.fromEntries((subs || []).map(s => [s.challenge_id, { id: s.id, status: s.status, type: s.submission_type }]));
    const enriched = withPicks(flatten(data)).map(c => ({
      ...c,
      my_submission_status: subMap[c.id]?.status || null,
      my_submission_id: subMap[c.id]?.id || null,
      my_submission_type: subMap[c.id]?.type || null,
    }));
    res.json(enriched);
    return;
  }

  res.json(withPicks(flatten(data)));
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { title, description, category, points, due_date, priority, status } = req.body;
  if (!title || !description || !points) {
    res.status(400).json({ error: 'title, description and points are required' });
    return;
  }
  const { data, error } = await supabase
    .from('challenges')
    .insert({ title, description, category, points: Number(points), due_date, priority: priority || 'normal', status: status || 'open', created_by: req.user!.id })
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  // Auto-create a news post so the feed shows new challenges
  await supabase.from('news_posts').insert({
    title: `New Challenge: ${data.title}`,
    content: data.description,
    points_awarded: 0,
    user_id: req.user!.id,
    challenge_id: data.id,
  });

  // Notify all employees of the new challenge
  const { data: employees } = await supabase.from('users').select('id').eq('role', 'employee');
  if (employees?.length) {
    const msg = `New challenge available: ${data.title} · ${data.points} pts`;
    const { data: notifs } = await supabase.from('notifications')
      .insert(employees.map(e => ({ user_id: e.id, type: 'new_challenge', message: msg })))
      .select();
    for (const n of notifs ?? []) sseManager.emit(n.user_id, n);
  }

  res.status(201).json(data);
});

// ── Social thread (challenge comments, visible to all) ────────────

router.get('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { data, error } = await supabase
    .from('challenge_comments')
    .select(`*, author:users!user_id(id, name, team, role), likes:challenge_comment_likes(user_id)`)
    .eq('challenge_id', req.params.id)
    .order('created_at', { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }

  res.json((data || []).map(c => ({
    ...c,
    like_count: Array.isArray(c.likes) ? c.likes.length : 0,
    my_like: Array.isArray(c.likes) ? c.likes.some((l: { user_id: string }) => l.user_id === userId) : false,
    likes: undefined,
  })));
});

router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: 'message is required' }); return; }

  const { data, error } = await supabase
    .from('challenge_comments')
    .insert({ challenge_id: req.params.id, user_id: req.user!.id, message: message.trim() })
    .select(`*, author:users!user_id(id, name, team, role)`)
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json({ ...data, like_count: 0, my_like: false });
});

router.post('/:id/comments/:commentId/like', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { commentId } = req.params;

  const { data: existing } = await supabase
    .from('challenge_comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('challenge_comment_likes').delete().eq('id', existing.id);
    res.json({ liked: false });
  } else {
    await supabase.from('challenge_comment_likes').insert({ comment_id: commentId, user_id: userId });
    res.json({ liked: true });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { title, description, category, points, due_date, priority, status } = req.body;
  const { data, error } = await supabase
    .from('challenges')
    .update({ title, description, category, points: points ? Number(points) : undefined, due_date, priority, status })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

export default router;
