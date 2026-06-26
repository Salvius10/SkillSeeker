import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import challengeRoutes from './routes/challenges';
import submissionRoutes from './routes/submissions';
import leaderboardRoutes from './routes/leaderboard';
import newsRoutes from './routes/news';
import notificationRoutes from './routes/notifications';
import analyticsRoutes from './routes/analytics';
import profileRoutes from './routes/profile';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/challenges', challengeRoutes);
app.use('/submissions', submissionRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/news', newsRoutes);
app.use('/notifications', notificationRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/profile', profileRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
