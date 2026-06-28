import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
  const userId = req.user!.id;

  const [
    { data: user },
    { data: submissions },
    { data: badges },
    { data: rankData },
  ] = await Promise.all([
    supabase.from('users').select('id, name, email, team, role, points, created_at').eq('id', userId).single(),
    supabase.from('submissions').select('*, challenge:challenges(title, points, category)').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('badges').select('*').eq('user_id', userId),
    supabase.from('users').select('id, points, team').eq('role', 'employee').order('points', { ascending: false }),
  ]);

  const rank = (rankData ?? []).findIndex(u => u.id === userId) + 1;
  const totalEmployees = rankData?.length ?? 0;

  // Rank within the user's team
  const userTeam = user?.team ?? '';
  const teamMembers = (rankData ?? [])
    .filter(u => u.team === userTeam)
    .sort((a, b) => b.points - a.points);
  const teamRank = teamMembers.findIndex(u => u.id === userId) + 1;
  const teamSize = teamMembers.length;

  // Submission breakdown
  const allSubs = submissions ?? [];
  const submissionStats = {
    total: allSubs.length,
    approved: allSubs.filter(s => s.status === 'approved').length,
    rejected: allSubs.filter(s => s.status === 'rejected').length,
    pending: allSubs.filter(s => s.status === 'pending').length,
  };

  // Points earned per category (approved only)
  const catPts: Record<string, number> = {};
  for (const s of allSubs) {
    if (s.status === 'approved' && s.challenge?.category) {
      const cat = s.challenge.category;
      catPts[cat] = (catPts[cat] ?? 0) + (s.challenge.points ?? 0);
    }
  }
  const points_by_category = Object.entries(catPts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, points]) => ({ category, points }));

  res.json({
    user,
    submissions: allSubs,
    badges: badges || [],
    rank,
    total_employees: totalEmployees,
    team_rank: teamRank,
    team_size: teamSize,
    submission_stats: submissionStats,
    points_by_category,
  });
  } catch (err) {
    console.error('[profile.GET]', err);
    res.status(500).json({ error: 'Failed to load profile. Please try again.' });
  }
});

export default router;
