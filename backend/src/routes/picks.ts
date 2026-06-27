import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/my', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('picks')
    .select('challenge_id')
    .eq('user_id', req.user!.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json((data || []).map(p => p.challenge_id));
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { challenge_id } = req.body;
  if (!challenge_id) { res.status(400).json({ error: 'challenge_id is required' }); return; }
  const { data, error } = await supabase
    .from('picks')
    .insert({ challenge_id, user_id: req.user!.id })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') { res.status(409).json({ error: 'Already picked' }); return; }
    res.status(500).json({ error: error.message }); return;
  }
  res.status(201).json(data);
});

router.delete('/:challengeId', requireAuth, async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('picks')
    .delete()
    .eq('challenge_id', req.params.challengeId)
    .eq('user_id', req.user!.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

export default router;
