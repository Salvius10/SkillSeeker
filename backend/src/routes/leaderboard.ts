import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string | undefined;

    if (period === 'month') {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: subs, error: subsErr } = await supabase
        .from('submissions')
        .select('user_id, challenge:challenges!challenge_id(points), user:users!user_id(name, team)')
        .eq('status', 'approved')
        .gte('reviewed_at', monthStart);

      if (subsErr) { res.status(500).json({ error: subsErr.message }); return; }

      const monthly = new Map<string, { name: string; team: string; points: number; count: number }>();
      type SubRow = { user_id: string; challenge: { points: number }[] | null; user: { name: string; team: string }[] | null };
      for (const s of (subs ?? []) as unknown as SubRow[]) {
        const pts = (Array.isArray(s.challenge) ? s.challenge[0]?.points : (s.challenge as unknown as { points: number } | null)?.points) ?? 0;
        const userName = Array.isArray(s.user) ? s.user[0]?.name : (s.user as { name: string } | null)?.name;
        const userTeam = Array.isArray(s.user) ? s.user[0]?.team : (s.user as { team: string } | null)?.team;
        if (!monthly.has(s.user_id)) {
          monthly.set(s.user_id, { name: userName ?? '', team: userTeam ?? '', points: 0, count: 0 });
        }
        const entry = monthly.get(s.user_id)!;
        entry.points += pts;
        entry.count++;
      }

      const ranked = [...monthly.entries()]
        .map(([uid, u]) => ({ rank: 0, user_id: uid, name: u.name, team: u.team, points: u.points, challenge_count: u.count }))
        .sort((a, b) => b.points - a.points)
        .map((u, i) => ({ ...u, rank: i + 1 }))
        .slice(0, 20);

      res.json(ranked);
      return;
    }

    // All-time: use users.points, count only approved submissions
    const [{ data, error }, { data: approvedSubs }] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, team, points')
        .eq('role', 'employee')
        .order('points', { ascending: false })
        .limit(20),
      supabase
        .from('submissions')
        .select('user_id')
        .eq('status', 'approved'),
    ]);

    if (error) { console.error('[leaderboard.GET]', error); res.status(500).json({ error: 'Could not load leaderboard' }); return; }

    const countMap = (approvedSubs ?? []).reduce((acc, s) => {
      acc[s.user_id] = (acc[s.user_id] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const ranked = (data || []).map((u, i) => ({
      rank: i + 1,
      user_id: u.id,
      name: u.name,
      team: u.team,
      points: u.points,
      challenge_count: countMap[u.id] ?? 0,
    }));

    res.json(ranked);
  } catch (err) {
    console.error('[leaderboard.GET month]', err);
    res.status(500).json({ error: 'Could not load leaderboard' });
  }
});

export default router;
