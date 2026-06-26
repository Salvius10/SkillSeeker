# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Skill Seeker is a full-stack internal challenge platform for ~200 DevOps/engineering teams. Employees earn points by completing technical challenges posted by admins. Two roles: **employee** (browse/submit) and **admin** (create/review/analyze). The UI design was imported from a Claude Design prototype (project ID: `4784490b-f9f7-4f1a-9ca8-708d6f5d34b8`).

## Monorepo structure

```
frontend/   React 18 + Vite 8 + TypeScript → deploys to Vercel
backend/    Express 5 + TypeScript          → deploys to Railway
schema.sql  Supabase (PostgreSQL) schema — run once in the Supabase SQL editor
```

## Commands

### Frontend (`cd frontend`)

```bash
npm run dev       # dev server at http://localhost:5173
npm run build     # tsc then vite build → dist/
npm run preview   # preview production build
```

### Backend (`cd backend`)

```bash
npm run dev       # ts-node-dev with hot reload, port 3001
npm run build     # tsc → dist/
npm start         # node dist/index.js (production)
```

Neither project has a test suite yet.

## Environment variables

**`backend/.env`** (copy from `backend/.env.example`):
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-side only, never in frontend)
- `JWT_SECRET` — long random string for signing tokens
- `FRONTEND_URL` — allowed CORS origin (e.g. `http://localhost:5173`)
- `PORT` — defaults to 3001

**`frontend/.env`** (copy from `frontend/.env.example`):
- `VITE_API_URL` — backend base URL (e.g. `http://localhost:3001`)

## Architecture

### Authentication flow

1. User registers or logs in via `POST /auth/register` or `/auth/login`
2. Backend returns a JWT containing `{ id, email, name, role }`
3. Frontend stores it in `localStorage` as `ss_token`
4. `frontend/src/api/client.ts` attaches it as `Authorization: Bearer <token>` on every request
5. `backend/src/middleware/auth.ts` — `requireAuth` decodes the JWT and sets `req.user`; `requireAdmin` gates admin-only routes

### Frontend routing

There is no URL router. `App.tsx` holds a `page` string in state and renders the matching component via a switch. Navigation happens by calling `setPage(...)`. The sidebar and topnav both receive `setPage` as a prop.

Page → component mapping:
- `challenges` → `pages/Challenges.tsx`
- `news` → `pages/NewsFeed.tsx`
- `leaderboard` → `pages/Leaderboard.tsx`
- `profile` → `pages/Profile.tsx`
- `notifications` → `pages/Notifications.tsx`
- `admin-challenges` → `pages/admin/AllChallenges.tsx`
- `admin-create` → `pages/admin/CreateChallenge.tsx`
- `admin-review` → `pages/admin/SubmissionReview.tsx`
- `admin-analytics` → `pages/admin/Analytics.tsx`

### State management

- `AuthContext` (`context/AuthContext.tsx`) — current user, token, login/logout. Persists token in localStorage.
- `App.tsx` — page, filter, minPoints passed as props to pages.
- No global state library. All data fetched per-page with `useEffect` + the API client functions.

### Backend route structure

All routes are registered in `backend/src/index.ts`. Each route file exports an Express Router:

| Route file | Prefix | Notable behaviour |
|---|---|---|
| `auth.ts` | `/auth` | bcrypt password hashing; JWT sign with 7d expiry |
| `challenges.ts` | `/challenges` | GET enriches with `entry_count` and employee's own `my_submission_status` |
| `submissions.ts` | `/submissions` | Approval triggers: `increment_points` RPC + news post creation + notification |
| `leaderboard.ts` | `/leaderboard` | Queries `users` table ordered by `points DESC`, joins submission count |
| `news.ts` | `/news` | Aggregates reaction counts; toggling same reaction type removes it |
| `notifications.ts` | `/notifications` | `PUT /read-all` marks all unread as read |
| `analytics.ts` | `/analytics` | Admin-only; parallel Supabase queries for KPIs |
| `profile.ts` | `/profile` | Returns user + submissions + badges + computed rank |

### Database (Supabase / PostgreSQL)

Key tables: `users`, `challenges`, `submissions`, `news_posts`, `reactions`, `notifications`, `badges`.

The `increment_points(user_id, amount)` Supabase RPC (defined in `schema.sql`) atomically updates user points — always use this instead of a direct UPDATE when awarding points.

Submission approval is a multi-step transaction in `submissions.ts PUT /:id/review`: update status → call RPC → insert news post → insert notification. These are sequential awaits, not a DB transaction, so keep that in mind if adding error handling.

### Styling

All styles are inline React style objects — no CSS framework, no CSS modules, no Tailwind. Key design tokens:
- Primary blue: `#1a00d9`
- Orange accent: `#fe6e06`
- Page background: `#f5f7fc`
- Card border: `#e7edf8`
- Muted text: `#9aa3b5`
- Sidebar gradient: `linear-gradient(180deg, #1a00d9 0%, #2219f5 100%)`

### Icons

`lucide-react` package — import named icons directly, e.g. `import { Trophy } from 'lucide-react'`. Do not use the CDN or `window.lucide.createIcons()` pattern from the original design file.
