import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_PASSWORD = 128;
const MAX_TEAM = 100;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes before trying again.' },
  skipSuccessfulRequests: true,
});

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const { email, password, name, team } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password and name are required' });
    return;
  }
  if (typeof email !== 'string' || email.length > MAX_EMAIL) {
    res.status(400).json({ error: 'Invalid email' }); return;
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > MAX_PASSWORD) {
    res.status(400).json({ error: 'Password must be 8–128 characters' }); return;
  }
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > MAX_NAME) {
    res.status(400).json({ error: 'Name must be 1–100 characters' }); return;
  }
  if (team && (typeof team !== 'string' || team.length > MAX_TEAM)) {
    res.status(400).json({ error: 'Team name must be 100 characters or fewer' }); return;
  }

  let hash: string;
  try { hash = await bcrypt.hash(password, 10); }
  catch { res.status(500).json({ error: 'Registration failed. Try again.' }); return; }

  const { data, error } = await supabase
    .from('users')
    .insert({ email: email.toLowerCase().trim(), password_hash: hash, name: name.trim(), team: team?.trim() || '', role: 'employee' })
    .select('id, email, name, role, team, points')
    .single();
  if (error) {
    // Surface duplicate-email conflict; hide all other DB internals
    if (error.code === '23505') {
      res.status(400).json({ error: 'An account with this email already exists' });
    } else {
      console.error('[auth.POST register]', error);
      res.status(500).json({ error: 'Registration failed. Try again.' });
    }
    return;
  }

  const token = jwt.sign(
    { id: data.id, email: data.email, name: data.name, role: data.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  res.json({ token, user: data });
});

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(401).json({ error: 'Invalid credentials' }); return;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, team, points, password_hash')
    .eq('email', typeof email === 'string' ? email.toLowerCase().trim() : '')
    .single();
  if (error || !data) {
    res.status(401).json({ error: 'Invalid credentials' }); return;
  }

  let valid: boolean;
  try { valid = await bcrypt.compare(password, data.password_hash); }
  catch { res.status(401).json({ error: 'Invalid credentials' }); return; }
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' }); return;
  }

  const { password_hash: _, ...user } = data;
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  res.json({ token, user });
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, team, points')
    .eq('id', req.user!.id)
    .single();
  if (error) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(data);
});

export default router;
