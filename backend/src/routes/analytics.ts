import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

function isoWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const [
    { data: users },
    { data: challenges },
    { data: submissions },
    { data: approvedSubs },
  ] = await Promise.all([
    supabase.from('users').select('id, name, team, points').eq('role', 'employee'),
    supabase.from('challenges').select('id, category, points, status'),
    supabase.from('submissions').select('user_id, created_at, status'),
    supabase.from('submissions').select('user_id, created_at, reviewed_at, challenge:challenges(points, category)').eq('status', 'approved'),
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

  // New metrics
  const pendingCount = (submissions ?? []).filter(s => s.status === 'pending').length;
  const decided = (submissions ?? []).filter(s => s.status !== 'pending');
  const approvedCount = decided.filter(s => s.status === 'approved').length;
  const approvalRate = decided.length > 0 ? Math.round((approvedCount / decided.length) * 100) : 0;

  const completionsByUser: Record<string, number> = {};
  for (const s of approvedSubs ?? []) {
    completionsByUser[s.user_id] = (completionsByUser[s.user_id] ?? 0) + 1;
  }
  const topEmployees = (users ?? [])
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map(u => ({ name: u.name, team: u.team, points: u.points, completions: completionsByUser[u.id] ?? 0 }));

  const cutoff = new Date(Date.now() - 8 * 7 * 86400000);
  const weekMap: Record<string, number> = {};
  for (const s of submissions ?? []) {
    if (new Date(s.created_at) < cutoff) continue;
    const w = isoWeek(new Date(s.created_at));
    weekMap[w] = (weekMap[w] ?? 0) + 1;
  }
  const submissionsByWeek = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  const userById = Object.fromEntries((users ?? []).map(u => [u.id, u]));
  const teamMap: Record<string, { points: number; members: Set<string>; completions: number }> = {};
  for (const u of users ?? []) {
    if (!teamMap[u.team]) teamMap[u.team] = { points: 0, members: new Set(), completions: 0 };
    teamMap[u.team].points += u.points;
    teamMap[u.team].members.add(u.id);
  }
  for (const s of approvedSubs ?? []) {
    const u = userById[s.user_id];
    if (u && teamMap[u.team]) teamMap[u.team].completions++;
  }
  const teamStats = Object.entries(teamMap)
    .map(([team, d]) => ({ team, total_points: d.points, member_count: d.members.size, completion_count: d.completions }))
    .sort((a, b) => b.total_points - a.total_points);

  res.json({
    participation_rate: participationRate,
    avg_days_to_submit: avgDaysToSubmit,
    total_points_awarded: totalPointsAwarded,
    challenges_posted: challenges?.length ?? 0,
    points_by_category: pointsByCategory,
    approval_rate: approvalRate,
    pending_count: pendingCount,
    top_employees: topEmployees,
    submissions_by_week: submissionsByWeek,
    team_stats: teamStats,
  });
});

export default router;
