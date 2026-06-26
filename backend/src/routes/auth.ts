import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, team, role } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password and name are required' });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash: hash, name, team: team || '', role: role === 'admin' ? 'admin' : 'employee' })
    .select('id, email, name, role, team, points')
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  const token = jwt.sign({ id: data.id, email: data.email, name: data.name, role: data.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ token, user: data });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, team, points, password_hash')
    .eq('email', email)
    .single();
  if (error || !data) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const { password_hash: _, ...user } = data;
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ token, user });
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, team, points')
    .eq('id', req.user!.id)
    .single();
  if (error) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(data);
});

export default router;
