import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { notify, notifyAdmins } from '../lib/notify';

const router = Router();

const URL_TYPES = new Set(['github_url', 'presentation_url', 'folder_url']);
const MAX_CONTENT = 5000;
const MAX_MESSAGE = 2000;
const MAX_FEEDBACK = 2000;

function isValidHttpUrl(str: string): boolean {
  try {
    const url = new URL(str.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function badgeMessage(badgeType: string): string {
  switch (badgeType) {
    case 'first_win':        return '🏅 Badge earned: First Win — you completed your first challenge!';
    case 'five_wins':        return '⭐ Badge earned: High Achiever — 5 challenges completed!';
    case 'ten_wins':         return '🏆 Badge earned: Expert — 10 challenges completed!';
    case 'urgent_responder': return '⚡ Badge earned: Urgent Responder — completed an urgent challenge!';
    default:                 return `🏅 Badge earned: ${badgeType}`;
  }
}

// Admin: get all submissions
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('submissions')
    .select(`*, challenge:challenges(title, points, category), user:users!user_id(name, team)`)
    .order('created_at', { ascending: false });
  if (error) { console.error('[submissions.GET]', error); res.status(500).json({ error: 'Could not load submissions' }); return; }
  res.json(data || []);
});

// Employee: get their own submissions
router.get('/my', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('submissions')
    .select(`*, challenge:challenges(title, points, category)`)
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });
  if (error) { console.error('[submissions.GET /my]', error); res.status(500).json({ error: 'Could not load your submissions' }); return; }
  res.json(data || []);
});

// Employee: submit to a challenge
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { challenge_id, content, submission_type } = req.body;
  if (!challenge_id || !content?.trim()) {
    res.status(400).json({ error: 'challenge_id and content are required' });
    return;
  }
  if (content.trim().length > MAX_CONTENT) {
    res.status(400).json({ error: `Content must be ${MAX_CONTENT} characters or fewer` });
    return;
  }

  const { data: pick } = await supabase
    .from('picks')
    .select('id')
    .eq('challenge_id', challenge_id)
    .eq('user_id', req.user!.id)
    .maybeSingle();
  if (!pick) {
    res.status(403).json({ error: 'You must pick this challenge before submitting' });
    return;
  }

  const { data: challenge } = await supabase
    .from('challenges')
    .select('title, due_date, status')
    .eq('id', challenge_id)
    .single();
  if (challenge?.status === 'closed') {
    res.status(400).json({ error: 'This challenge is closed and no longer accepting submissions' });
    return;
  }
  if (challenge?.due_date) {
    const due = new Date(challenge.due_date);
    due.setHours(23, 59, 59, 999);
    if (Date.now() > due.getTime()) {
      res.status(400).json({ error: 'The due date for this challenge has passed' });
      return;
    }
  }

  const sType = submission_type || 'text';
  if (URL_TYPES.has(sType) && !isValidHttpUrl(content)) {
    res.status(400).json({ error: 'Submission content must be a valid URL starting with http:// or https://' });
    return;
  }

  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('challenge_id', challenge_id)
    .eq('user_id', req.user!.id)
    .maybeSingle();
  if (existing) {
    res.status(409).json({ error: 'Already submitted to this challenge' });
    return;
  }

  const { data, error } = await supabase
    .from('submissions')
    .insert({ challenge_id, user_id: req.user!.id, content: content.trim(), submission_type: sType, status: 'pending' })
    .select()
    .single();
  if (error) { console.error('[submissions.POST]', error); res.status(500).json({ error: 'Could not create submission' }); return; }

  await notifyAdmins('new_submission', `${req.user!.name} submitted: ${challenge?.title ?? 'a challenge'} · pending review`);
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
  if (error) { console.error('[submissions.GET messages]', error); res.status(500).json({ error: 'Could not load messages' }); return; }
  res.json(data || []);
});

// Post a message to a submission thread
router.post('/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: 'message is required' }); return; }
  if (message.trim().length > MAX_MESSAGE) {
    res.status(400).json({ error: `Message must be ${MAX_MESSAGE} characters or fewer` }); return;
  }

  const { data: sub } = await supabase
    .from('submissions')
    .select('user_id, challenge_id')
    .eq('id', req.params.id)
    .single();
  if (!sub) { res.status(404).json({ error: 'Submission not found' }); return; }
  if (sub.user_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  const { data, error } = await supabase
    .from('submission_messages')
    .insert({ submission_id: req.params.id, user_id: req.user!.id, message: message.trim(), is_admin: req.user!.role === 'admin' })
    .select(`*, author:users!user_id(name, role)`)
    .single();
  if (error) { console.error('[submissions.POST message]', error); res.status(500).json({ error: 'Could not send message' }); return; }

  const { data: challenge } = await supabase.from('challenges').select('title').eq('id', sub.challenge_id).single();
  const title = challenge?.title ?? 'a challenge';

  if (req.user!.role === 'admin') {
    await notify(sub.user_id, 'thread_reply', `${req.user!.name} replied in your submission thread: ${title}`);
  } else {
    await notifyAdmins('thread_reply_employee', `${req.user!.name} replied in submission thread: ${title} · check for their update`);
  }

  res.status(201).json(data);
});

// Employee: resubmit after rejection
router.put('/:id/resubmit', requireAuth, async (req: Request, res: Response) => {
  const { content, submission_type } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: 'content is required' }); return; }
  if (content.trim().length > MAX_CONTENT) {
    res.status(400).json({ error: `Content must be ${MAX_CONTENT} characters or fewer` }); return;
  }

  const { data: sub } = await supabase
    .from('submissions')
    .select('user_id, status, challenge_id')
    .eq('id', req.params.id)
    .single();
  if (!sub) { res.status(404).json({ error: 'Submission not found' }); return; }
  if (sub.user_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (sub.status !== 'rejected') { res.status(400).json({ error: 'Can only resubmit rejected submissions' }); return; }

  const sType = submission_type || 'text';
  if (URL_TYPES.has(sType) && !isValidHttpUrl(content)) {
    res.status(400).json({ error: 'Submission content must be a valid URL starting with http:// or https://' });
    return;
  }

  const { data, error } = await supabase
    .from('submissions')
    .update({ content: content.trim(), submission_type: sType, status: 'pending', reviewed_by: null, reviewed_at: null })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) { console.error('[submissions.PUT resubmit]', error); res.status(500).json({ error: 'Could not resubmit' }); return; }

  const { data: challenge } = await supabase.from('challenges').select('title').eq('id', sub.challenge_id).single();
  await notifyAdmins('resubmission', `${req.user!.name} resubmitted: ${challenge?.title ?? 'a challenge'} · ready for re-review`);

  res.json(data);
});

// Admin: approve or reject a submission
router.put('/:id/review', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { status, feedback } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'status must be approved or rejected' });
    return;
  }
  if (feedback && feedback.length > MAX_FEEDBACK) {
    res.status(400).json({ error: `Feedback must be ${MAX_FEEDBACK} characters or fewer` }); return;
  }

  const { data: sub, error: subErr } = await supabase
    .from('submissions')
    .select(`*, challenge:challenges(title, points, category, priority)`)
    .eq('id', req.params.id)
    .single();
  if (subErr || !sub) { res.status(404).json({ error: 'Submission not found' }); return; }

  // Atomic guard: only transition from 'pending' — prevents double-approval race
  const { data: updated, error: updateErr } = await supabase
    .from('submissions')
    .update({ status, reviewed_by: req.user!.id, reviewed_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('status', 'pending')
    .select();
  if (updateErr) { console.error('[submissions.PUT review update]', updateErr); res.status(500).json({ error: 'Review failed. Please try again.' }); return; }
  if (!updated?.length) {
    res.status(409).json({ error: 'This submission has already been reviewed — no changes made.' });
    return;
  }

  const data = updated[0];
  const challenge = sub.challenge as { title: string; points: number; category: string; priority: string };

  if (status === 'approved') {
    // Count already-approved submissions to determine this person's completion rank
    const { count: priorApprovals } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_id', sub.challenge_id)
      .eq('status', 'approved');

    const rank = (priorApprovals ?? 0) + 1;
    const multiplier = rank === 1 ? 1 : rank === 2 ? 0.75 : rank === 3 ? 0.5 : 0.25;
    const pointsAwarded = Math.round(challenge.points * multiplier);

    const { error: rpcError } = await supabase.rpc('increment_points', {
      user_id: sub.user_id,
      amount: pointsAwarded,
    });
    if (rpcError) {
      await supabase.from('submissions')
        .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
        .eq('id', req.params.id);
      console.error('[submissions.PUT review rpc]', rpcError);
      res.status(500).json({ error: 'Failed to award points. Submission reverted to pending — please try approving again.' });
      return;
    }

    await supabase.from('submissions').update({ points_awarded: pointsAwarded }).eq('id', req.params.id);
    await supabase.from('picks').delete().eq('challenge_id', sub.challenge_id).eq('user_id', sub.user_id);

    await supabase.from('news_posts').insert({
      user_id: sub.user_id,
      challenge_id: sub.challenge_id,
      title: challenge.title,
      content: feedback || '',
      points_awarded: pointsAwarded,
    });

    const rankLabel = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
    await notify(sub.user_id, 'submission_approved', `Your submission was approved! ${challenge.title} · +${pointsAwarded} pts (${rankLabel} to complete)`);

    // Milestone badges
    const { count: approvedCount } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', sub.user_id)
      .eq('status', 'approved');

    for (const [threshold, badgeType] of [[1, 'first_win'], [5, 'five_wins'], [10, 'ten_wins']] as [number, string][]) {
      if (approvedCount === threshold) {
        const { data: alreadyEarned } = await supabase
          .from('badges').select('id').eq('user_id', sub.user_id).eq('badge_type', badgeType).maybeSingle();
        if (!alreadyEarned) {
          await supabase.from('badges').insert({ user_id: sub.user_id, badge_type: badgeType });
          await notify(sub.user_id, 'badge_earned', badgeMessage(badgeType));
        }
      }
    }

    if (challenge.priority === 'urgent') {
      const { data: alreadyEarned } = await supabase
        .from('badges').select('id').eq('user_id', sub.user_id).eq('badge_type', 'urgent_responder').maybeSingle();
      if (!alreadyEarned) {
        await supabase.from('badges').insert({ user_id: sub.user_id, badge_type: 'urgent_responder' });
        await notify(sub.user_id, 'badge_earned', badgeMessage('urgent_responder'));
      }
    }

  } else {
    if (feedback?.trim()) {
      await supabase.from('submission_messages').insert({
        submission_id: req.params.id,
        user_id: req.user!.id,
        message: feedback.trim(),
        is_admin: true,
      });
    }
    await notify(sub.user_id, 'submission_rejected', `Revision requested on: ${challenge.title}${feedback ? ' · check your thread for feedback' : ''}`);
  }

  res.json(data);
});

export default router;
