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
  category: string;
  points: number;
  due_date: string;
  status: 'open' | 'closed';
  priority: 'normal' | 'urgent';
  created_by: string;
  created_at: string;
  entry_count?: number;
  my_submission_status?: 'pending' | 'approved' | 'rejected' | null;
}

export interface Submission {
  id: string;
  challenge_id: string;
  user_id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  challenge?: Challenge;
  user?: Pick<User, 'id' | 'name' | 'team'>;
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
  avg_days_to_submit: number;
  total_points_awarded: number;
  challenges_posted: number;
  points_by_category: { category: string; points: number }[];
}

export interface Badge {
  id: string;
  badge_type: string;
  earned_at: string;
}
