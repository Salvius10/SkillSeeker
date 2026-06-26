import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [
    { data: user },
    { data: submissions },
    { data: badges },
    { data: rankData },
  ] = await Promise.all([
    supabase.from('users').select('id, name, email, team, role, points').eq('id', userId).single(),
    supabase.from('submissions').select('*, challenge:challenges(title, points, category)').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('badges').select('*').eq('user_id', userId),
    supabase.from('users').select('id, points').eq('role', 'employee').order('points', { ascending: false }),
  ]);

  const rank = (rankData ?? []).findIndex(u => u.id === userId) + 1;

  res.json({ user, submissions: submissions || [], badges: badges || [], rank });
});

export default router;
