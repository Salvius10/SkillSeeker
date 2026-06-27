import { useState, useEffect } from 'react';
import { LayoutGrid, Zap, AlertTriangle, Coins, Edit2, X, Check } from 'lucide-react';
import { getChallenges, updateChallenge } from '../../api/client';
import type { Challenge } from '../../types';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
  surface: '#ffffff',
  surfaceLow: '#f2f3ff',
  border: '#dae2fd',
  text: '#131b2e',
  textSec: '#454556',
  textMuted: '#545567',
  success: '#10b981',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: '#fee7e0', fg: '#d32f2f' },
  open:   { bg: '#eaedff', fg: C.primary },
  closed: { bg: C.surfaceLow, fg: C.textMuted },
};

const inp: React.CSSProperties = {
  height: 36,
  border: '1px solid #dae2fd',
  borderRadius: 8,
  padding: '0 10px',
  fontSize: 13,
  fontFamily: C.sans,
  outline: 'none',
  width: '100%',
  background: C.surface,
  color: C.text,
};
const sel: React.CSSProperties = { ...inp, cursor: 'pointer' };

interface EditForm { title: string; status: 'open' | 'closed'; priority: 'normal' | 'urgent'; due_date: string; }

const card: React.CSSProperties = {
  background: C.surface,
  border: '1px solid #dae2fd',
  borderRadius: 14,
  boxShadow: '0 4px 12px rgba(26,0,217,0.04)',
};

export default function AllChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', status: 'open', priority: 'normal', due_date: '' });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getChallenges().then(setChallenges).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (c: Challenge) => {
    setEditId(c.id);
    setEditForm({ title: c.title, status: c.status, priority: c.priority, due_date: c.due_date ? c.due_date.slice(0, 10) : '' });
  };
  const cancelEdit = () => setEditId(null);

  const saveEdit = async () => {
    if (!editId) return;
    setEditError('');
    setSaving(true);
    try {
      await updateChallenge(editId, editForm);
      setEditId(null);
      load();
    } catch (e: unknown) {
      setEditError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error updating challenge. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const quickClose = async (id: string) => {
    try { await updateChallenge(id, { status: 'closed' }); load(); } catch {}
  };

  const totalPts = challenges.reduce((s, c) => s + c.points, 0);
  const open = challenges.filter(c => c.status === 'open').length;
  const urgent = challenges.filter(c => c.priority === 'urgent').length;

  if (loading) return (
    <div style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>
      <div style={{ width: 36, height: 36, border: `3px solid #dae2fd`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Challenges', val: challenges.length, color: C.primary, icon: <LayoutGrid size={18} color={C.primary} /> },
          { label: 'Open', val: open, color: C.success, icon: <Check size={18} color={C.success} /> },
          { label: 'Urgent', val: urgent, color: C.orange, icon: <AlertTriangle size={18} color={C.orange} /> },
          { label: 'Points Pool', val: totalPts.toLocaleString(), color: '#413ff4', icon: <Coins size={18} color='#413ff4' /> },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '18px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.05em', fontFamily: C.mono }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color, fontFamily: C.mono, lineHeight: 1.1 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 72px 90px 100px 150px', padding: '12px 20px', background: C.surfaceLow, borderBottom: '1px solid #dae2fd', fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: C.mono }}>
          <span>Challenge</span>
          <span style={{ textAlign: 'center' }}>Status</span>
          <span style={{ textAlign: 'center' }}>Entries</span>
          <span style={{ textAlign: 'right' }}>Points</span>
          <span style={{ textAlign: 'right' }}>Due</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {challenges.map(c => {
          const statusKey = c.priority === 'urgent' ? 'urgent' : c.status;
          const { bg, fg } = STATUS_STYLE[statusKey] ?? { bg: C.surfaceLow, fg: C.textMuted };
          const isEditing = editId === c.id;

          return (
            <div key={c.id}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 72px 90px 100px 150px',
                padding: '14px 20px',
                borderBottom: isEditing ? 'none' : '1px solid #f2f3ff',
                alignItems: 'center',
                background: isEditing ? '#f8f9ff' : undefined,
                transition: 'background 0.15s',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{c.title}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2, fontFamily: C.mono }}>{c.category.toUpperCase()}</div>
                </div>
                <span style={{ textAlign: 'center' }}>
                  <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: C.mono, letterSpacing: '0.03em', display: 'inline-block' }}>
                    {c.priority === 'urgent' ? 'URGENT' : c.status.toUpperCase()}
                  </span>
                </span>
                <span style={{ textAlign: 'center', color: C.textSec, fontSize: 13, fontFamily: C.mono }}>{c.entry_count ?? 0}</span>
                <span style={{ textAlign: 'right', fontWeight: 800, color: C.orange, fontSize: 14, fontFamily: C.mono }}>{c.points}</span>
                <span style={{ textAlign: 'right', fontSize: 12, color: C.textMuted, fontFamily: C.mono }}>
                  {c.due_date ? new Date(c.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => isEditing ? cancelEdit() : startEdit(c)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: isEditing ? C.surfaceLow : '#eaedff', color: isEditing ? C.textSec : C.primary, border: 'none', borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}>
                    {isEditing ? <><X size={12} /> Cancel</> : <><Edit2 size={12} /> Edit</>}
                  </button>
                  {!isEditing && c.status === 'open' && (
                    <button onClick={() => quickClose(c.id)} style={{ background: C.surfaceLow, color: C.textSec, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}>Close</button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f2f3ff', background: '#f8f9ff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 150px', gap: 12, alignItems: 'end' }}>
                    {[
                      { label: 'Title', el: <input style={inp} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /> },
                      { label: 'Status', el: <select style={sel} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as 'open' | 'closed' }))}><option value="open">Open</option><option value="closed">Closed</option></select> },
                      { label: 'Priority', el: <select style={sel} value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as 'normal' | 'urgent' }))}><option value="normal">Normal</option><option value="urgent">Urgent</option></select> },
                      { label: 'Due Date', el: <input type="date" style={inp} value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} /> },
                    ].map(({ label, el }) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: C.mono, marginBottom: 4 }}>{label}</div>
                        {el}
                      </div>
                    ))}
                  </div>
                  {editError && (
                    <div style={{ fontSize: 12.5, color: '#d32f2f', background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 8, padding: '8px 12px' }}>{editError}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEdit} disabled={saving} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,0,217,0.2)' }}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button onClick={cancelEdit} style={{ background: C.surfaceLow, color: C.textSec, border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, fontFamily: C.sans, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {challenges.length === 0 && <div style={{ textAlign: 'center', color: C.textMuted, padding: 40, fontSize: 14 }}>No challenges yet.</div>}
      </div>
    </div>
  );
}
