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
  try {
  const [
    { data: users },
    { data: challenges },
    // FIX #11: Include reviewed_at for all submissions so we can compute turnaround for both approved and rejected
    { data: submissions },
    { data: approvedSubs },
  ] = await Promise.all([
    supabase.from('users').select('id, name, team, points').eq('role', 'employee'),
    supabase.from('challenges').select('id, title, category, points, status'),
    supabase.from('submissions').select('user_id, challenge_id, created_at, reviewed_at, status'),
    supabase.from('submissions')
      .select('user_id, challenge_id, created_at, reviewed_at, challenge:challenges(points, category)')
      .eq('status', 'approved'),
  ]);

  // ── Participation ─────────────────────────────────────────────────
  const totalUsers = users?.length ?? 0;
  const participatingUsers = new Set(submissions?.map(s => s.user_id) ?? []).size;
  const participationRate = totalUsers > 0 ? Math.round((participatingUsers / totalUsers) * 100) : 0;

  // ── Submission counts ─────────────────────────────────────────────
  const totalSubmissions = submissions?.length ?? 0;
  const approvedCount = approvedSubs?.length ?? 0;
  const rejectedCount = (submissions ?? []).filter(s => s.status === 'rejected').length;
  const pendingCount = (submissions ?? []).filter(s => s.status === 'pending').length;

  // ── Approval rate ─────────────────────────────────────────────────
  const decided = approvedCount + rejectedCount;
  const approvalRate = decided > 0 ? Math.round((approvedCount / decided) * 100) : 0;

  // ── FIX #11: Review turnaround includes both approved AND rejected decisions ──
  const reviewDiffs = (submissions ?? [])
    .filter(s => s.reviewed_at && (s.status === 'approved' || s.status === 'rejected'))
    .map(s => (new Date(s.reviewed_at!).getTime() - new Date(s.created_at).getTime()) / 86400000);
  const avgReviewDays = reviewDiffs.length
    ? +(reviewDiffs.reduce((a, b) => a + b, 0) / reviewDiffs.length).toFixed(1)
    : 0;

  // ── Points ────────────────────────────────────────────────────────
  const totalPointsAwarded = (approvedSubs ?? []).reduce((sum, s) => {
    const pts = (s.challenge as unknown as { points: number } | null)?.points ?? 0;
    return sum + pts;
  }, 0);

  // ── Challenge stats ───────────────────────────────────────────────
  const openChallenges = (challenges ?? []).filter(c => c.status === 'open').length;
  const closedChallenges = (challenges ?? []).filter(c => c.status === 'closed').length;
  const totalPointsPool = (challenges ?? [])
    .filter(c => c.status === 'open')
    .reduce((sum, c) => sum + c.points, 0);

  // ── Points by category ────────────────────────────────────────────
  const categoryMap: Record<string, number> = {};
  for (const s of approvedSubs ?? []) {
    const cat = (s.challenge as unknown as { category: string; points: number } | null)?.category ?? 'Other';
    const pts = (s.challenge as unknown as { category: string; points: number } | null)?.points ?? 0;
    categoryMap[cat] = (categoryMap[cat] ?? 0) + pts;
  }
  const pointsByCategory = Object.entries(categoryMap).map(([category, points]) => ({ category, points }));

  // ── Top performers ────────────────────────────────────────────────
  const completionsByUser: Record<string, number> = {};
  for (const s of approvedSubs ?? []) {
    completionsByUser[s.user_id] = (completionsByUser[s.user_id] ?? 0) + 1;
  }
  const topEmployees = (users ?? [])
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map(u => ({ name: u.name, team: u.team, points: u.points, completions: completionsByUser[u.id] ?? 0 }));

  // ── Submission trend by week ──────────────────────────────────────
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

  // ── Team performance ──────────────────────────────────────────────
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

  // ── FIX #12: Top challenges ranked by APPROVED submissions only ───
  // Previously counted all submissions (including rejected), making high-rejection
  // challenges look falsely popular. Now only approved completions count.
  const challengeApprovedCount: Record<string, number> = {};
  for (const s of approvedSubs ?? []) {
    if (s.challenge_id) {
      challengeApprovedCount[s.challenge_id] = (challengeApprovedCount[s.challenge_id] ?? 0) + 1;
    }
  }
  const challengeById = Object.fromEntries((challenges ?? []).map(c => [c.id, c]));
  const topChallenges = Object.entries(challengeApprovedCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([id, count]) => ({
      id,
      title: challengeById[id]?.title ?? 'Unknown',
      count,
      status: challengeById[id]?.status ?? 'open',
    }));

  res.json({
    participation_rate: participationRate,
    total_submissions: totalSubmissions,
    approved_count: approvedCount,
    rejected_count: rejectedCount,
    pending_count: pendingCount,
    approval_rate: approvalRate,
    avg_review_days: avgReviewDays,
    total_points_awarded: totalPointsAwarded,
    open_challenges: openChallenges,
    closed_challenges: closedChallenges,
    total_points_pool: totalPointsPool,
    challenges_posted: (challenges?.length ?? 0),
    points_by_category: pointsByCategory,
    top_employees: topEmployees,
    submissions_by_week: submissionsByWeek,
    team_stats: teamStats,
    top_challenges: topChallenges,
  });
  } catch (err) {
    console.error('[analytics.GET]', err);
    res.status(500).json({ error: 'Failed to load analytics. Please try again.' });
  }
});

export default router;
