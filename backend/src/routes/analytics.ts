import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const [
    { data: users },
    { data: challenges },
    { data: submissions },
    { data: approvedSubs },
  ] = await Promise.all([
    supabase.from('users').select('id').eq('role', 'employee'),
    supabase.from('challenges').select('id, category, points, status'),
    supabase.from('submissions').select('user_id, created_at, status'),
    supabase.from('submissions').select('created_at, reviewed_at, challenge:challenges(points, category)').eq('status', 'approved'),
  ]);

  const totalUsers = users?.length ?? 0;
  const participatingUsers = new Set(submissions?.map(s => s.user_id) ?? []).size;
  const participationRate = totalUsers > 0 ? Math.round((participatingUsers / totalUsers) * 100) : 0;

  const totalPointsAwarded = (approvedSubs ?? []).reduce((sum, s) => {
    const pts = (s.challenge as unknown as { points: number } | null)?.points ?? 0;
    return sum + pts;
  }, 0);

  const avgDaysToSubmit = (() => {
    const diffs = (approvedSubs ?? [])
      .filter(s => s.created_at && s.reviewed_at)
      .map(s => (new Date(s.reviewed_at!).getTime() - new Date(s.created_at).getTime()) / 86400000);
    return diffs.length ? +(diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1) : 0;
  })();

  const categoryMap: Record<string, number> = {};
  for (const s of approvedSubs ?? []) {
    const cat = (s.challenge as unknown as { category: string; points: number } | null)?.category ?? 'Other';
    const pts = (s.challenge as unknown as { category: string; points: number } | null)?.points ?? 0;
    categoryMap[cat] = (categoryMap[cat] ?? 0) + pts;
  }
  const pointsByCategory = Object.entries(categoryMap).map(([category, points]) => ({ category, points }));

  res.json({
    participation_rate: participationRate,
    avg_days_to_submit: avgDaysToSubmit,
    total_points_awarded: totalPointsAwarded,
    challenges_posted: challenges?.length ?? 0,
    points_by_category: pointsByCategory,
  });
});

export default router;
