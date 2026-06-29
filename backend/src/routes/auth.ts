import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Called by the frontend after every OAuth login to ensure the user exists in our DB.
// Verifies the Supabase JWT directly (no requireAuth) because the user may not be in
// our users table yet on first sign-in.
router.post('/sync', async (req: Request, res: Response) => {
  const raw = req.headers.authorization?.slice(7);
  if (!raw) { res.status(401).json({ error: 'Missing token' }); return; }

  const { data: { user: supaUser }, error: authError } = await supabase.auth.getUser(raw);
  if (authError || !supaUser) {
    res.status(401).json({ error: 'Invalid token' }); return;
  }

  const sub = supaUser.id;
  const email = supaUser.email ?? '';
  const meta = (supaUser.user_metadata ?? {}) as Record<string, string>;

  // Return existing user without touching the row (preserves manually-set role)
  const { data: existing } = await supabase
    .from('users')
    .select('id, email, name, role, team, points')
    .eq('id', sub)
    .maybeSingle();

  if (existing) { res.json(existing); return; }

  // First login: create the user record
  const name = meta.full_name ?? meta.name ?? email.split('@')[0] ?? 'User';
  const { data, error } = await supabase
    .from('users')
    .insert({ id: sub, email, name, role: 'employee', password_hash: '' })
    .select('id, email, name, role, team, points')
    .single();

  if (error) {
    // Race condition: another request created it between our select and insert
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('users')
        .select('id, email, name, role, team, points')
        .eq('id', sub)
        .single();
      if (retry) { res.json(retry); return; }
    }
    console.error('[auth.sync]', error);
    res.status(500).json({ error: 'Could not create user profile' }); return;
  }

  res.status(201).json(data);
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
