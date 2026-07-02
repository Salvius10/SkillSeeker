import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { notifyAllEmployees, notifyUsers } from '../lib/notify';

const router = Router();

const MIN_POINTS = 1;
const MAX_POINTS = 10000;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;
const MAX_CATEGORY = 80;
const SUBMISSION_TYPES = new Set(['text', 'github_url', 'presentation_url', 'folder_url']);

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
    supabase.from('picks').select('challenge_id, team_id, user:users!user_id(id, name)'),
    supabase.from('submissions').select('challenge_id').eq('status', 'approved'),
  ]);

  // So the admin (and teammates) can see who's grouped into which team, not just a flat picker list.
  const pickTeamIds = [...new Set((pickRows ?? []).map(p => p.team_id).filter((id): id is string => !!id))];
  let leadByTeam: Record<string, string> = {};
  if (pickTeamIds.length) {
    const { data: teamsData } = await supabase.from('challenge_teams').select('id, lead_id').in('id', pickTeamIds);
    leadByTeam = Object.fromEntries((teamsData ?? []).map(t => [t.id, t.lead_id]));
  }

  const pickersMap: Record<string, { id: string; name: string; team_id: string | null; is_lead: boolean }[]> = {};
  for (const p of (pickRows || [])) {
    const raw = p.user as unknown;
    const u = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string } | null;
    if (!u) continue;
    if (!pickersMap[p.challenge_id]) pickersMap[p.challenge_id] = [];
    pickersMap[p.challenge_id].push({
      id: u.id,
      name: u.name,
      team_id: p.team_id ?? null,
      is_lead: !!p.team_id && leadByTeam[p.team_id] === u.id,
    });
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
    const { data: mySubs } = await supabase
      .from('submissions')
      .select('id, challenge_id, status, submission_type, user_id')
      .eq('user_id', req.user!.id);

    // Teammates share one submission — surface it to everyone on the team, not just whoever hit Submit.
    const { data: myTeamPicks } = await supabase
      .from('picks')
      .select('challenge_id, team_id')
      .eq('user_id', req.user!.id)
      .not('team_id', 'is', null);

    let teamSubs: typeof mySubs = [];
    if (myTeamPicks?.length) {
      const teamIds = myTeamPicks.map(p => p.team_id);
      const { data: teammatePicks } = await supabase
        .from('picks')
        .select('challenge_id, user_id')
        .in('team_id', teamIds as string[]);

      const teammateIdsByChallenge: Record<string, string[]> = {};
      for (const p of teammatePicks ?? []) {
        (teammateIdsByChallenge[p.challenge_id] ??= []).push(p.user_id);
      }

      const { data: subsOnMyChallenges } = await supabase
        .from('submissions')
        .select('id, challenge_id, status, submission_type, user_id')
        .in('challenge_id', myTeamPicks.map(p => p.challenge_id));

      teamSubs = (subsOnMyChallenges ?? []).filter(s => (teammateIdsByChallenge[s.challenge_id] ?? []).includes(s.user_id));
    }

    const subMap = Object.fromEntries(
      [...teamSubs, ...(mySubs || [])].map(s => [s.challenge_id, { id: s.id, status: s.status, type: s.submission_type }])
    );
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
  const { title, description, acceptance_criteria, output_format, notes, category, points, due_date, priority, status, allowed_submission_types } = req.body;
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
  if (!Array.isArray(allowed_submission_types) || !allowed_submission_types.length || !allowed_submission_types.every((t: unknown) => SUBMISSION_TYPES.has(t as string))) {
    res.status(400).json({ error: 'Select at least one allowed submission format' });
    return;
  }

  const ptsResult = validatePoints(points);
  if (!ptsResult.ok) { res.status(400).json({ error: ptsResult.error }); return; }

  const { data, error } = await supabase
    .from('challenges')
    .insert({ title, description, acceptance_criteria, output_format, notes: notes || '', category, points: ptsResult.value, due_date, priority: priority || 'normal', status: status || 'open', created_by: req.user!.id, allowed_submission_types })
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
  const { title, description, acceptance_criteria, output_format, notes, category, points, due_date, priority, status, allowed_submission_types } = req.body;

  if (title !== undefined && typeof title === 'string' && title.trim().length > MAX_TITLE) {
    res.status(400).json({ error: `Title must be ${MAX_TITLE} characters or fewer` }); return;
  }
  if (description !== undefined && typeof description === 'string' && description.trim().length > MAX_DESCRIPTION) {
    res.status(400).json({ error: `Description must be ${MAX_DESCRIPTION} characters or fewer` }); return;
  }
  if (allowed_submission_types !== undefined && (!Array.isArray(allowed_submission_types) || !allowed_submission_types.length || !allowed_submission_types.every((t: unknown) => SUBMISSION_TYPES.has(t as string)))) {
    res.status(400).json({ error: 'Select at least one allowed submission format' });
    return;
  }

  let validatedPoints: number | undefined;
  if (points !== undefined && points !== null && points !== '') {
    const ptsResult = validatePoints(points);
    if (!ptsResult.ok) { res.status(400).json({ error: ptsResult.error }); return; }
    validatedPoints = ptsResult.value;
  }

  const { data, error } = await supabase
    .from('challenges')
    .update({ title, description, acceptance_criteria, output_format, notes, category, points: validatedPoints, due_date, priority, status, allowed_submission_types })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) { console.error('[challenges.PUT]', error); res.status(500).json({ error: 'Could not update challenge' }); return; }

  const { data: picks } = await supabase
    .from('picks')
    .select('user_id')
    .eq('challenge_id', req.params.id);

  if (picks?.length) {
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

    await notifyUsers(picks.map(p => p.user_id), notifType, notifMsg);
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
