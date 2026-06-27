-- Run this in the Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  team text not null default '',
  points integer not null default 0,
  created_at timestamptz not null default now()
);

-- Challenges
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null default 'General',
  points integer not null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'closed')),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- Submissions
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id),
  user_id uuid not null references users(id),
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(challenge_id, user_id)
);

-- News posts (auto-created on submission approval)
create table if not exists news_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  challenge_id uuid references challenges(id),
  title text not null,
  content text not null default '',
  points_awarded integer not null default 0,
  created_at timestamptz not null default now()
);

-- Reactions (celebrate / comment on news posts)
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references news_posts(id) on delete cascade,
  user_id uuid not null references users(id),
  type text not null check (type in ('celebrate', 'comment')),
  created_at timestamptz not null default now(),
  unique(post_id, user_id, type)
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Badges
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  badge_type text not null,
  earned_at timestamptz not null default now()
);

-- RPC to increment points atomically
create or replace function increment_points(user_id uuid, amount integer)
returns void language sql as $$
  update users set points = points + amount where id = user_id;
$$;

-- Indexes for common queries
create index if not exists idx_submissions_user on submissions(user_id);
create index if not exists idx_submissions_challenge on submissions(challenge_id);
create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_news_created on news_posts(created_at desc);
create index if not exists idx_users_points on users(points desc);

-- Picks (employee must pick a challenge before submitting)
create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  picked_at timestamptz not null default now(),
  unique(challenge_id, user_id)
);
create index if not exists idx_picks_user on picks(user_id);

-- Submission type (text / github_url / presentation_url / folder_url)
alter table submissions add column if not exists submission_type text not null default 'text'
  check (submission_type in ('text', 'github_url', 'presentation_url', 'folder_url'));

-- Threaded submission messages
create table if not exists submission_messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  message text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_submission_messages_sub on submission_messages(submission_id);
