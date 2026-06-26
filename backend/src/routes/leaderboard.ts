import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

function extractCount(val: unknown): number {
  if (typeof val === 'number') return val;
  if (Array.isArray(val)) return Number(val[0]?.count ?? 0);
  if (val && typeof val === 'object' && 'count' in val) return Number((val as { count: unknown }).count);
  return 0;
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`id, name, team, points, challenge_count:submissions!user_id(count)`)
      .eq('role', 'employee')
      .order('points', { ascending: false })
      .limit(20);

    if (error) { res.status(500).json({ error: error.message }); return; }

    const ranked = (data || []).map((u, i) => ({
      rank: i + 1,
      user_id: u.id,
      name: u.name,
      team: u.team,
      points: u.points,
      challenge_count: extractCount(u.challenge_count),
    }));

    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
