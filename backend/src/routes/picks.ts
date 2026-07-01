import { Router, Request, Response } from 'express';
import { randomInt } from 'crypto';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';
import { notifyAdmins } from '../lib/notify';

const router = Router();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
function generateInviteCode(len = 6): string {
  let code = '';
  for (let i = 0; i < len; i++) code += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return code;
}

router.get('/my', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('picks')
    .select('challenge_id')
    .eq('user_id', req.user!.id);
  if (error) { console.error('[picks.GET /my]', error); res.status(500).json({ error: 'Could not load picks' }); return; }
  res.json((data || []).map(p => p.challenge_id));
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { challenge_id } = req.body;
  if (!challenge_id) { res.status(400).json({ error: 'challenge_id is required' }); return; }

  const { count } = await supabase
    .from('picks')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challenge_id);
  if ((count ?? 0) > 0) {
    res.status(409).json({ error: 'Already picked. Ask the picker for an invite code to join their team.' });
    return;
  }

  const { data, error } = await supabase
    .from('picks')
    .insert({ challenge_id, user_id: req.user!.id })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Already picked' });
    } else {
      console.error('[picks.POST]', error);
      res.status(500).json({ error: 'Could not pick challenge' });
    }
    return;
  }

  const { data: challenge } = await supabase.from('challenges').select('title').eq('id', challenge_id).single();
  await notifyAdmins('challenge_picked', `${req.user!.name} picked: ${challenge?.title ?? 'a challenge'}`);

  res.status(201).json(data);
});

// Get or create the invite code for the challenge I've picked (I become team lead)
router.post('/:challengeId/invite', requireAuth, async (req: Request, res: Response) => {
  const { challengeId } = req.params;

  const { data: myPick } = await supabase
    .from('picks')
    .select('id, team_id')
    .eq('challenge_id', challengeId)
    .eq('user_id', req.user!.id)
    .maybeSingle();
  if (!myPick) { res.status(403).json({ error: 'You must pick this challenge first' }); return; }

  if (myPick.team_id) {
    const { data: team, error } = await supabase
      .from('challenge_teams')
      .select('invite_code, lead_id')
      .eq('id', myPick.team_id)
      .single();
    if (error || !team) { console.error('[picks.POST invite]', error); res.status(500).json({ error: 'Could not load invite code' }); return; }
    if (team.lead_id !== req.user!.id) { res.status(403).json({ error: 'Only the team lead can share the invite code' }); return; }
    res.json({ invite_code: team.invite_code });
    return;
  }

  let team: { id: string; invite_code: string } | null = null;
  for (let i = 0; i < 5 && !team; i++) {
    const invite_code = generateInviteCode();
    const { data, error } = await supabase
      .from('challenge_teams')
      .insert({ challenge_id: challengeId, invite_code, lead_id: req.user!.id })
      .select()
      .single();
    if (data) { team = data; break; }
    if (error?.code === '23505') continue; // invite_code collision — retry
    console.error('[picks.POST invite create]', error);
    res.status(500).json({ error: 'Could not create invite' });
    return;
  }
  if (!team) { res.status(500).json({ error: 'Could not generate an invite code, please try again' }); return; }

  const { error: attachErr } = await supabase.from('picks').update({ team_id: team.id }).eq('id', myPick.id);
  if (attachErr) { console.error('[picks.POST invite attach]', attachErr); res.status(500).json({ error: 'Could not create invite' }); return; }

  res.json({ invite_code: team.invite_code });
});

// Join a teammate's pick using their invite code
router.post('/join', requireAuth, async (req: Request, res: Response) => {
  const invite_code = String(req.body?.invite_code || '').trim().toUpperCase();
  if (!invite_code) { res.status(400).json({ error: 'invite_code is required' }); return; }

  const { data: team, error } = await supabase
    .from('challenge_teams')
    .select('id, challenge_id')
    .eq('invite_code', invite_code)
    .maybeSingle();
  if (error) { console.error('[picks.POST join]', error); res.status(500).json({ error: 'Could not join team' }); return; }
  if (!team) { res.status(404).json({ error: 'Invalid invite code' }); return; }

  const { data: challenge } = await supabase.from('challenges').select('title, status').eq('id', team.challenge_id).single();
  if (challenge?.status === 'closed') { res.status(400).json({ error: 'This challenge is closed and no longer accepting submissions' }); return; }

  const { data, error: insErr } = await supabase
    .from('picks')
    .insert({ challenge_id: team.challenge_id, user_id: req.user!.id, team_id: team.id })
    .select()
    .single();
  if (insErr) {
    if (insErr.code === '23505') { res.status(409).json({ error: 'You already picked this challenge' }); return; }
    console.error('[picks.POST join insert]', insErr);
    res.status(500).json({ error: 'Could not join team' });
    return;
  }

  await notifyAdmins('challenge_picked', `${req.user!.name} joined a team on: ${challenge?.title ?? 'a challenge'}`);
  res.status(201).json(data);
});

// View my team for a challenge (invite code only shown to the lead)
router.get('/:challengeId/team', requireAuth, async (req: Request, res: Response) => {
  const { challengeId } = req.params;

  const { data: myPick } = await supabase
    .from('picks')
    .select('team_id')
    .eq('challenge_id', challengeId)
    .eq('user_id', req.user!.id)
    .maybeSingle();
  if (!myPick?.team_id) { res.json({ team: null, members: [] }); return; }

  const { data: team, error } = await supabase
    .from('challenge_teams')
    .select('id, lead_id, invite_code')
    .eq('id', myPick.team_id)
    .single();
  if (error || !team) { console.error('[picks.GET team]', error); res.status(500).json({ error: 'Could not load team' }); return; }

  const { data: memberRows } = await supabase
    .from('picks')
    .select('user:users!user_id(id, name)')
    .eq('team_id', myPick.team_id);

  const members = (memberRows ?? [])
    .map(m => (Array.isArray(m.user) ? m.user[0] : m.user) as { id: string; name: string } | null)
    .filter((u): u is { id: string; name: string } => !!u);

  res.json({
    team: { id: team.id, lead_id: team.lead_id, invite_code: team.lead_id === req.user!.id ? team.invite_code : null },
    members,
  });
});

router.delete('/:challengeId', requireAuth, async (req: Request, res: Response) => {
  const { challengeId } = req.params;

  const { data: pendingSub } = await supabase
    .from('submissions')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('user_id', req.user!.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingSub) {
    res.status(409).json({ error: 'Cannot unpick: your submission is currently under review. Wait for the admin decision or contact them directly.' });
    return;
  }

  const { error } = await supabase
    .from('picks')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('user_id', req.user!.id);
  if (error) { console.error('[picks.DELETE]', error); res.status(500).json({ error: 'Could not remove pick' }); return; }

  const { data: challenge } = await supabase.from('challenges').select('title').eq('id', challengeId).single();
  await notifyAdmins('challenge_unpicked', `⚠️ ${req.user!.name} dropped: "${challenge?.title ?? 'a challenge'}" — now available for others to pick`);

  res.json({ ok: true });
});

export default router;
