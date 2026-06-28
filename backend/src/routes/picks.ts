import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';
import { notifyAdmins } from '../lib/notify';

const router = Router();

router.get('/my', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('picks')
    .select('challenge_id')
    .eq('user_id', req.user!.id);
  if (error) { console.error('[picks.GET /my]', error); res.status(500).json({ error: 'Could not load picks' }); return; }
  res.json((data || []).map(p => p.challenge_id));
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { challenge_id } = req.body;
  if (!challenge_id) { res.status(400).json({ error: 'challenge_id is required' }); return; }

  const { data: existing } = await supabase
    .from('picks')
    .select('user_id')
    .eq('challenge_id', challenge_id)
    .maybeSingle();

  if (existing) {
    res.status(409).json({
      error: existing.user_id === req.user!.id
        ? 'Already picked'
        : 'This challenge has already been picked by another team member',
    });
    return;
  }

  const { data, error } = await supabase
    .from('picks')
    .insert({ challenge_id, user_id: req.user!.id })
    .select()
    .single();
  if (error) { console.error('[picks.POST]', error); res.status(500).json({ error: 'Could not pick challenge' }); return; }

  const { data: challenge } = await supabase.from('challenges').select('title').eq('id', challenge_id).single();
  await notifyAdmins('challenge_picked', `${req.user!.name} picked: ${challenge?.title ?? 'a challenge'}`);

  res.status(201).json(data);
});

router.delete('/:challengeId', requireAuth, async (req: Request, res: Response) => {
  const { challengeId } = req.params;

  const { data: pendingSub } = await supabase
    .from('submissions')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('user_id', req.user!.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingSub) {
    res.status(409).json({ error: 'Cannot unpick: your submission is currently under review. Wait for the admin decision or contact them directly.' });
    return;
  }

  const { error } = await supabase
    .from('picks')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('user_id', req.user!.id);
  if (error) { console.error('[picks.DELETE]', error); res.status(500).json({ error: 'Could not remove pick' }); return; }

  const { data: challenge } = await supabase.from('challenges').select('title').eq('id', challengeId).single();
  await notifyAdmins('challenge_unpicked', `⚠️ ${req.user!.name} dropped: "${challenge?.title ?? 'a challenge'}" — now available for others to pick`);

  res.json({ ok: true });
});

export default router;
