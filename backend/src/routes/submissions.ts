import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Admin: get all pending submissions
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('submissions')
    .select(`*, challenge:challenges(title, points, category), user:users!user_id(name, team)`)
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data || []);
});

// Employee: get their own submissions
router.get('/my', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('submissions')
    .select(`*, challenge:challenges(title, points, category)`)
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data || []);
});

// Employee: submit to a challenge
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { challenge_id, content } = req.body;
  if (!challenge_id || !content) {
    res.status(400).json({ error: 'challenge_id and content are required' });
    return;
  }
  // Prevent duplicate submission
  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('challenge_id', challenge_id)
    .eq('user_id', req.user!.id)
    .single();
  if (existing) {
    res.status(409).json({ error: 'Already submitted to this challenge' });
    return;
  }
  const { data, error } = await supabase
    .from('submissions')
    .insert({ challenge_id, user_id: req.user!.id, content, status: 'pending' })
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// Admin: approve or reject a submission
router.put('/:id/review', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { status, feedback } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'status must be approved or rejected' });
    return;
  }

  const { data: sub, error: subErr } = await supabase
    .from('submissions')
    .select('*, challenge:challenges(title, points, category)')
    .eq('id', req.params.id)
    .single();
  if (subErr || !sub) { res.status(404).json({ error: 'Submission not found' }); return; }

  const { data, error } = await supabase
    .from('submissions')
    .update({ status, reviewed_by: req.user!.id, reviewed_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }

  if (status === 'approved') {
    // Award points to user
    await supabase.rpc('increment_points', { user_id: sub.user_id, amount: sub.challenge.points });

    // Create news post
    await supabase.from('news_posts').insert({
      user_id: sub.user_id,
      challenge_id: sub.challenge_id,
      title: sub.challenge.title,
      content: feedback || '',
      points_awarded: sub.challenge.points,
    });

    // Notify submitter
    await supabase.from('notifications').insert({
      user_id: sub.user_id,
      type: 'submission_approved',
      message: `Your submission was approved! ${sub.challenge.title} · +${sub.challenge.points} pts awarded`,
    });
  } else {
    await supabase.from('notifications').insert({
      user_id: sub.user_id,
      type: 'submission_rejected',
      message: `Revision requested on: ${sub.challenge.title}`,
    });
  }

  res.json(data);
});

export default router;
