import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../db';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const token = header.slice(7);
  let sub: string;
  try {
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { sub: string };
    sub = payload.sub;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('id', sub)
    .maybeSingle();

  if (error || !user) {
    res.status(401).json({ error: 'User not found. Please sign in again.' });
    return;
  }

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
