import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';
import { sseManager } from '../lib/sseManager';
import type { JwtPayload } from '../types/index';

const router = Router();

// SSE stream — must be registered before /:id patterns
router.get('/stream', (req: Request, res: Response) => {
  const raw = (req.headers.authorization?.slice(7)) || (req.query.token as string);
  if (!raw) { res.status(401).end(); return; }
  try {
    const payload = jwt.verify(raw, process.env.JWT_SECRET!) as JwtPayload;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.socket?.setNoDelay(true);
    res.flushHeaders();
    sseManager.add(payload.id, res);
    req.on('close', () => sseManager.remove(payload.id, res));
  } catch {
    res.status(401).end();
  }
});

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

router.put('/:id/read', requireAuth, async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

export default router;
