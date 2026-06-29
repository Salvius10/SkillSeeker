import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Validate required env vars at startup — fail fast rather than 500 at runtime
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'FRONTEND_URL'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

import authRoutes from './routes/auth';
import challengeRoutes from './routes/challenges';
import submissionRoutes from './routes/submissions';
import leaderboardRoutes from './routes/leaderboard';
import newsRoutes from './routes/news';
import notificationRoutes from './routes/notifications';
import analyticsRoutes from './routes/analytics';
import profileRoutes from './routes/profile';
import picksRoutes from './routes/picks';

const app = express();

// Trust Railway's reverse proxy so req.ip is the real client IP
app.set('trust proxy', 1);

// Structured request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.originalUrl.split('?')[0]; // capture before Express rewrites req.path for sub-routers
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(JSON.stringify({ level, method: req.method, path, status: res.statusCode, ms, ip: req.ip }));
  });
  next();
});

// Fail-closed CORS — FRONTEND_URL is guaranteed set above
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json({ limit: '256kb' }));

app.use('/auth', authRoutes);
app.use('/challenges', challengeRoutes);
app.use('/submissions', submissionRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/news', newsRoutes);
app.use('/notifications', notificationRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/profile', profileRoutes);
app.use('/picks', picksRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Global error handler — catches any unhandled throw from async routes
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(JSON.stringify({ level: 'ERROR', method: req.method, path: req.path, error: String(err) }));
  if (res.headersSent) return;
  res.status(500).json({ error: 'An unexpected error occurred' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(JSON.stringify({ level: 'INFO', message: `API running on port ${PORT}` })));
