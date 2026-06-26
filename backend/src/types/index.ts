export interface User {
  id: string;
  email: string;
  name: string;
  role: 'employee' | 'admin';
  team: string;
  points: number;
  created_at: string;
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
}

export interface NewsPost {
  id: string;
  user_id: string;
  challenge_id: string | null;
  title: string;
  content: string;
  points_awarded: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: 'employee' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
