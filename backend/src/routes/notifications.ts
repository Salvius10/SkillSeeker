import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data || []);
});

router.put('/read-all', requireAuth, async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', req.user!.id)
    .eq('read', false);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

export default router;
