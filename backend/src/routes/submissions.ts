import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { sseManager } from '../lib/sseManager';

const router = Router();

// Admin: get all submissions
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
  const { challenge_id, content, submission_type } = req.body;
  if (!challenge_id || !content) {
    res.status(400).json({ error: 'challenge_id and content are required' });
    return;
  }
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
    .insert({ challenge_id, user_id: req.user!.id, content, submission_type: submission_type || 'text', status: 'pending' })
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// Get messages for a submission thread
router.get('/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const { data: sub } = await supabase.from('submissions').select('user_id').eq('id', req.params.id).single();
  if (!sub) { res.status(404).json({ error: 'Submission not found' }); return; }
  if (sub.user_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  const { data, error } = await supabase
    .from('submission_messages')
    .select(`*, author:users!user_id(name, role)`)
    .eq('submission_id', req.params.id)
    .order('created_at', { ascending: true });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data || []);
});

// Post a message to a submission thread
router.post('/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) { res.status(400).json({ error: 'message is required' }); return; }
  const { data: sub } = await supabase.from('submissions').select('user_id').eq('id', req.params.id).single();
  if (!sub) { res.status(404).json({ error: 'Submission not found' }); return; }
  if (sub.user_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  const { data, error } = await supabase
    .from('submission_messages')
    .insert({ submission_id: req.params.id, user_id: req.user!.id, message, is_admin: req.user!.role === 'admin' })
    .select(`*, author:users!user_id(name, role)`)
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// Employee: resubmit after rejection
router.put('/:id/resubmit', requireAuth, async (req: Request, res: Response) => {
  const { content, submission_type } = req.body;
  if (!content) { res.status(400).json({ error: 'content is required' }); return; }
  const { data: sub } = await supabase.from('submissions').select('user_id, status').eq('id', req.params.id).single();
  if (!sub) { res.status(404).json({ error: 'Submission not found' }); return; }
  if (sub.user_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (sub.status !== 'rejected') { res.status(400).json({ error: 'Can only resubmit rejected submissions' }); return; }
  const { data, error } = await supabase
    .from('submissions')
    .update({ content, submission_type: submission_type || 'text', status: 'pending', reviewed_by: null, reviewed_at: null })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
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
    await supabase.rpc('increment_points', { user_id: sub.user_id, amount: sub.challenge.points });

    await supabase.from('news_posts').insert({
      user_id: sub.user_id,
      challenge_id: sub.challenge_id,
      title: sub.challenge.title,
      content: feedback || '',
      points_awarded: sub.challenge.points,
    });

    const approvedMsg = `Your submission was approved! ${sub.challenge.title} · +${sub.challenge.points} pts awarded`;
    const { data: notif } = await supabase.from('notifications').insert({
      user_id: sub.user_id,
      type: 'submission_approved',
      message: approvedMsg,
    }).select().single();
    if (notif) sseManager.emit(sub.user_id, notif);
  } else {
    // Save admin feedback as a thread message
    if (feedback) {
      await supabase.from('submission_messages').insert({
        submission_id: req.params.id,
        user_id: req.user!.id,
        message: feedback,
        is_admin: true,
      });
    }

    const rejectedMsg = `Revision requested on: ${sub.challenge.title}`;
    const { data: notif } = await supabase.from('notifications').insert({
      user_id: sub.user_id,
      type: 'submission_rejected',
      message: rejectedMsg,
    }).select().single();
    if (notif) sseManager.emit(sub.user_id, notif);
  }

  res.json(data);
});

export default router;
