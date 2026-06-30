import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { sseManager } from '../lib/sseManager';
import { notifyAllEmployees } from '../lib/notify';

const router = Router();

const MIN_POINTS = 1;
const MAX_POINTS = 10000;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;
const MAX_CATEGORY = 80;

function validatePoints(points: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const n = Number(points);
  if (!Number.isInteger(n)) return { ok: false, error: 'points must be an integer' };
  if (n < MIN_POINTS) return { ok: false, error: `points must be at least ${MIN_POINTS}` };
  if (n > MAX_POINTS) return { ok: false, error: `points cannot exceed ${MAX_POINTS}` };
  return { ok: true, value: n };
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { filter, minPoints, category } = req.query;

  let query = supabase
    .from('challenges')
    .select(`*, entry_count:submissions!challenge_id(count), creator:users!created_by(name)`)
    .order('created_at', { ascending: false });

  const minPtsNum = Number(minPoints);
  if (minPoints && Number.isFinite(minPtsNum)) query = query.gte('points', minPtsNum);
  if (category) query = query.eq('category', String(category).slice(0, MAX_CATEGORY));
  if (filter === 'urgent') query = query.eq('priority', 'urgent');
  else if (filter === 'open') query = query.eq('status', 'open');
  else if (filter === 'closed') query = query.eq('status', 'closed');

  const { data, error } = await query;
  if (error) { console.error('[challenges.GET]', error); res.status(500).json({ error: 'Could not load challenges' }); return; }

  const flatten = (rows: typeof data) =>
    (rows || []).map(c => ({
      ...c,
      entry_count: Array.isArray(c.entry_count) ? (c.entry_count[0]?.count ?? 0) : (c.entry_count ?? 0),
    }));

  const [{ data: pickRows }, { data: approvedRows }] = await Promise.all([
    supabase.from('picks').select('challenge_id, user:users!user_id(id, name)'),
    supabase.from('submissions').select('challenge_id').eq('status', 'approved'),
  ]);

  const pickersMap: Record<string, { id: string; name: string }[]> = {};
  for (const p of (pickRows || [])) {
    const raw = p.user as unknown;
    const u = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string } | null;
    if (!u) continue;
    if (!pickersMap[p.challenge_id]) pickersMap[p.challenge_id] = [];
    pickersMap[p.challenge_id].push({ id: u.id, name: u.name });
  }

  const approvedCountMap: Record<string, number> = {};
  for (const s of (approvedRows || [])) {
    approvedCountMap[s.challenge_id] = (approvedCountMap[s.challenge_id] || 0) + 1;
  }

  const withCounts = (rows: ReturnType<typeof flatten>) =>
    rows.map(c => ({
      ...c,
      pickers: pickersMap[c.id] || [],
      pick_count: (pickersMap[c.id] || []).length,
      approved_count: approvedCountMap[c.id] || 0,
    }));

  if (req.user!.role === 'employee') {
    const { data: subs } = await supabase
      .from('submissions')
      .select('id, challenge_id, status, submission_type')
      .eq('user_id', req.user!.id);

    const subMap = Object.fromEntries((subs || []).map(s => [s.challenge_id, { id: s.id, status: s.status, type: s.submission_type }]));
    const enriched = withCounts(flatten(data)).map(c => ({
      ...c,
      my_submission_status: subMap[c.id]?.status || null,
      my_submission_id: subMap[c.id]?.id || null,
      my_submission_type: subMap[c.id]?.type || null,
    }));
    res.json(enriched);
    return;
  }

  res.json(withCounts(flatten(data)));
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { title, description, acceptance_criteria, output_format, notes, category, points, due_date, priority, status } = req.body;
  if (!title || !description || !acceptance_criteria || !output_format || !points) {
    res.status(400).json({ error: 'title, description, acceptance criteria, output format and points are required' });
    return;
  }
  if (typeof title === 'string' && title.trim().length > MAX_TITLE) {
    res.status(400).json({ error: `Title must be ${MAX_TITLE} characters or fewer` }); return;
  }
  if (typeof description === 'string' && description.trim().length > MAX_DESCRIPTION) {
    res.status(400).json({ error: `Description must be ${MAX_DESCRIPTION} characters or fewer` }); return;
  }

  const ptsResult = validatePoints(points);
  if (!ptsResult.ok) { res.status(400).json({ error: ptsResult.error }); return; }

  const { data, error } = await supabase
    .from('challenges')
    .insert({ title, description, acceptance_criteria, output_format, notes: notes || '', category, points: ptsResult.value, due_date, priority: priority || 'normal', status: status || 'open', created_by: req.user!.id })
    .select()
    .single();
  if (error) { console.error('[challenges.POST]', error); res.status(500).json({ error: 'Could not create challenge' }); return; }

  await supabase.from('news_posts').insert({
    title: `New Challenge: ${data.title}`,
    content: data.description,
    points_awarded: 0,
    user_id: req.user!.id,
    challenge_id: data.id,
  });

  await notifyAllEmployees('new_challenge', `New challenge available: ${data.title} · ${data.points} pts`);

  res.status(201).json(data);
});

router.get('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { data, error } = await supabase
    .from('challenge_comments')
    .select(`*, author:users!user_id(id, name, team, role), likes:challenge_comment_likes(user_id)`)
    .eq('challenge_id', req.params.id)
    .order('created_at', { ascending: true });
  if (error) { console.error('[challenges.GET comments]', error); res.status(500).json({ error: 'Could not load comments' }); return; }
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
  if (message.trim().length > 2000) { res.status(400).json({ error: 'Message must be 2000 characters or fewer' }); return; }

  const { data, error } = await supabase
    .from('challenge_comments')
    .insert({ challenge_id: req.params.id, user_id: req.user!.id, message: message.trim() })
    .select(`*, author:users!user_id(id, name, team, role)`)
    .single();
  if (error) { console.error('[challenges.POST comment]', error); res.status(500).json({ error: 'Could not post comment' }); return; }
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
  const { title, description, acceptance_criteria, output_format, notes, category, points, due_date, priority, status } = req.body;

  if (title !== undefined && typeof title === 'string' && title.trim().length > MAX_TITLE) {
    res.status(400).json({ error: `Title must be ${MAX_TITLE} characters or fewer` }); return;
  }
  if (description !== undefined && typeof description === 'string' && description.trim().length > MAX_DESCRIPTION) {
    res.status(400).json({ error: `Description must be ${MAX_DESCRIPTION} characters or fewer` }); return;
  }

  let validatedPoints: number | undefined;
  if (points !== undefined && points !== null && points !== '') {
    const ptsResult = validatePoints(points);
    if (!ptsResult.ok) { res.status(400).json({ error: ptsResult.error }); return; }
    validatedPoints = ptsResult.value;
  }

  const { data, error } = await supabase
    .from('challenges')
    .update({ title, description, acceptance_criteria, output_format, notes, category, points: validatedPoints, due_date, priority, status })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) { console.error('[challenges.PUT]', error); res.status(500).json({ error: 'Could not update challenge' }); return; }

  const { data: pick } = await supabase
    .from('picks')
    .select('user_id')
    .eq('challenge_id', req.params.id)
    .maybeSingle();

  if (pick) {
    let notifMsg: string;
    let notifType: string;
    if (status === 'closed') {
      notifMsg = `⚠️ Challenge closed: "${data.title}" — it is no longer accepting submissions`;
      notifType = 'challenge_closed';
    } else {
      const changes: string[] = [];
      if (points !== undefined) changes.push(`points changed to ${validatedPoints}`);
      if (due_date !== undefined) changes.push('due date updated');
      if (priority !== undefined) changes.push(`priority set to ${priority}`);
      if (title !== undefined) changes.push('title updated');
      notifMsg = `Challenge updated: "${data.title}"${changes.length ? ' · ' + changes.join(', ') : ''}`;
      notifType = 'challenge_updated';
    }

    const { data: notif } = await supabase.from('notifications').insert({
      user_id: pick.user_id, type: notifType, message: notifMsg,
    }).select().single();
    if (notif) sseManager.emit(pick.user_id, notif);
  }

  res.json(data);
});

router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = req.params.id;
  // Delete child records that don't have ON DELETE CASCADE
  await supabase.from('submission_messages').delete().in(
    'submission_id',
    (await supabase.from('submissions').select('id').eq('challenge_id', id)).data?.map(s => s.id) ?? []
  );
  await supabase.from('submissions').delete().eq('challenge_id', id);
  await supabase.from('news_posts').delete().eq('challenge_id', id);

  const { error } = await supabase.from('challenges').delete().eq('id', id);
  if (error) { console.error('[challenges.DELETE]', error); res.status(500).json({ error: 'Could not delete challenge' }); return; }
  res.status(204).end();
});

export default router;
