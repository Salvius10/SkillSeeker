export interface User {
  id: string;
  email: string;
  name: string;
  role: 'employee' | 'admin';
  team: string;
  points: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  output_format: string;
  notes: string;
  category: string;
  points: number;
  due_date: string;
  status: 'open' | 'closed';
  priority: 'normal' | 'urgent';
  created_by: string;
  created_at: string;
  allowed_submission_types?: string[] | null;
  entry_count?: number;
  pick_count?: number;
  approved_count?: number;
  pickers?: { id: string; name: string; team_id: string | null; is_lead: boolean }[];
  my_submission_status?: 'pending' | 'approved' | 'rejected' | null;
  my_submission_id?: string | null;
  my_submission_type?: string | null;
}

export interface ChallengeTeam {
  id: string;
  lead_id: string;
  invite_code: string | null; // only present when the caller is the lead
}

export interface MyTeamEntry {
  challenge: { id: string; title: string; status: 'open' | 'closed'; points: number };
  team: ChallengeTeam;
  members: { id: string; name: string }[];
}

export interface ChallengeComment {
  id: string;
  challenge_id: string;
  user_id: string;
  message: string;
  created_at: string;
  author?: { id: string; name: string; team: string; role: string };
  like_count: number;
  my_like: boolean;
}

export interface Submission {
  id: string;
  challenge_id: string;
  user_id: string;
  content: string;
  submission_type?: 'text' | 'github_url' | 'presentation_url' | 'folder_url';
  status: 'pending' | 'approved' | 'rejected';
  points_awarded?: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  challenge?: Challenge;
  user?: Pick<User, 'id' | 'name' | 'team'>;
}

export interface SubmissionMessage {
  id: string;
  submission_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  author?: { name: string; role: string };
}

export interface NewsComment {
  id: string;
  post_id: string;
  user_id: string;
  message: string;
  created_at: string;
  author?: Pick<User, 'id' | 'name' | 'team'>;
}

export interface NewsPost {
  id: string;
  user_id: string;
  challenge_id: string | null;
  title: string;
  content: string;
  points_awarded: number;
  created_at: string;
  author?: Pick<User, 'id' | 'name' | 'team'>;
  celebrate_count: number;
  comment_count: number;
  my_reaction?: 'celebrate' | 'comment' | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  team: string;
  points: number;
  challenge_count: number;
}

export interface AnalyticsData {
  participation_rate: number;
  avg_review_days: number;
  total_points_awarded: number;
  total_submissions: number;
  approved_count: number;
  rejected_count: number;
  open_challenges: number;
  closed_challenges: number;
  total_points_pool: number;
  challenges_posted: number;
  points_by_category: { category: string; points: number }[];
  approval_rate: number;
  pending_count: number;
  top_employees: { name: string; team: string; points: number; completions: number }[];
  submissions_by_week: { week: string; count: number }[];
  team_stats: { team: string; total_points: number; member_count: number; completion_count: number }[];
  top_challenges: { id: string; title: string; count: number; status: string }[];
}

export interface Badge {
  id: string;
  badge_type: string;
  earned_at: string;
}
