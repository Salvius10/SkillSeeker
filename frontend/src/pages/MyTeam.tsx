import { useState, useEffect } from 'react';
import { Users, Copy, Check, Crown, LogOut } from 'lucide-react';
import { getMyTeams, unpickChallenge } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { MyTeamEntry } from '../types';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
  bg: '#faf8ff',
  surface: '#ffffff',
  surfaceLow: '#f2f3ff',
  border: '#dae2fd',
  text: '#131b2e',
  textSec: '#454556',
  textMuted: '#545567',
  success: '#10b981',
  danger: '#d32f2f',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const card: React.CSSProperties = {
  background: C.surface,
  border: '1px solid #dae2fd',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 4px 12px rgba(26,0,217,0.04)',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function MyTeam() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MyTeamEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<{ teamId: string; message: string } | null>(null);

  useEffect(() => {
    getMyTeams()
      .then(setEntries)
      .catch(() => setFetchError('Failed to load your teams. Please refresh and try again.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (teamId: string, code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(teamId);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleLeave = async (entry: MyTeamEntry) => {
    setLeaveError(null);
    setLeavingId(entry.team.id);
    try {
      await unpickChallenge(entry.challenge.id);
      setEntries(prev => (prev ?? []).filter(e => e.team.id !== entry.team.id));
    } catch (e: unknown) {
      const message = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not leave the team. Try again.';
      setLeaveError({ teamId: entry.team.id, message });
    } finally {
      setLeavingId(null);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>
      <div style={{ width: 36, height: 36, border: `3px solid #dae2fd`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
    </div>
  );
  if (fetchError) return (
    <div style={{ textAlign: 'center', padding: 60, color: C.textMuted }}>
      <div style={{ fontSize: 15, color: '#d32f2f', background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 12, padding: '14px 20px', display: 'inline-block' }}>{fetchError}</div>
    </div>
  );
  if (!entries) return null;

  return (
    <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: '-0.6px' }}>My Team</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: C.textMuted }}>Every challenge you're teamed up on, and who's working on it with you.</p>
      </div>

      {entries.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 60 }}>
          <Users size={32} style={{ color: 'rgba(26,0,217,0.15)', marginBottom: 14 }} />
          <div style={{ fontWeight: 700, color: C.textSec, marginBottom: 4 }}>You're not on any teams yet</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>Pick a challenge and use "Team Up" to invite others onto it.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {entries.map(entry => {
            const { challenge, team, members } = entry;
            return (
            <div key={team.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>{challenge.title}</h3>
                    {challenge.status === 'closed' && (
                      <span style={{ background: C.surfaceLow, color: C.textMuted, fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, fontFamily: C.mono }}>CLOSED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textMuted, fontFamily: C.mono }}>{challenge.points} pts · {members.length} {members.length === 1 ? 'member' : 'members'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {team.invite_code && (
                    <button
                      onClick={() => handleCopy(team.id, team.invite_code!)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surfaceLow, color: C.primary, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}
                    >
                      {copiedId === team.id ? <Check size={13} /> : <Copy size={13} />} {team.invite_code}
                    </button>
                  )}
                  <button
                    onClick={() => handleLeave(entry)}
                    disabled={leavingId === team.id}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: C.textMuted, border: '1px solid #dae2fd', borderRadius: 10, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, fontFamily: C.sans, cursor: 'pointer' }}
                  >
                    <LogOut size={13} /> {leavingId === team.id ? 'Leaving…' : 'Leave Team'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.surfaceLow, border: `1px solid ${C.border}`, borderRadius: 12, padding: '8px 12px 8px 8px' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.id === user?.id ? C.primary : '#eaedff', color: m.id === user?.id ? '#fff' : C.primary, fontWeight: 800, fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {initials(m.name)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.id === user?.id ? 'You' : m.name}</span>
                    {m.id === team.lead_id && <Crown size={13} color={C.orange} />}
                  </div>
                ))}
              </div>

              {leaveError?.teamId === team.id && (
                <div style={{ marginTop: 12, fontSize: 12.5, color: C.danger, background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                  {leaveError.message}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
