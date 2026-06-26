import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';

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

  // If employee, attach their own submission status
  if (req.user!.role === 'employee') {
    const { data: subs } = await supabase
      .from('submissions')
      .select('challenge_id, status')
      .eq('user_id', req.user!.id);

    const subMap = Object.fromEntries((subs || []).map(s => [s.challenge_id, s.status]));
    const enriched = flatten(data).map(c => ({ ...c, my_submission_status: subMap[c.id] || null }));
    res.json(enriched);
    return;
  }

  res.json(flatten(data));
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { title, description, category, points, due_date, priority } = req.body;
  if (!title || !description || !points) {
    res.status(400).json({ error: 'title, description and points are required' });
    return;
  }
  const { data, error } = await supabase
    .from('challenges')
    .insert({ title, description, category, points: Number(points), due_date, priority: priority || 'normal', status: 'open', created_by: req.user!.id })
    .select()
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
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
