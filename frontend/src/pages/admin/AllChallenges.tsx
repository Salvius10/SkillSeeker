import { useState, useEffect } from 'react';
import { getChallenges, updateChallenge } from '../../api/client';
import type { Challenge } from '../../types';

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: '#fee7e0', fg: '#d32f2f' },
  open: { bg: '#e6f1ff', fg: '#2a6fdb' },
  closed: { bg: '#f0f3fa', fg: '#5e6d8a' },
};

const inp: React.CSSProperties = { height: 36, border: '1px solid #e2e8f4', borderRadius: 8, padding: '0 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%' };
const sel: React.CSSProperties = { ...inp, background: '#fff', cursor: 'pointer' };

interface EditForm { title: string; status: 'open' | 'closed'; priority: 'normal' | 'urgent'; due_date: string; }

export default function AllChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', status: 'open', priority: 'normal', due_date: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getChallenges().then(setChallenges).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (c: Challenge) => {
    setEditId(c.id);
    setEditForm({
      title: c.title,
      status: c.status,
      priority: c.priority,
      due_date: c.due_date ? c.due_date.slice(0, 10) : '',
    });
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await updateChallenge(editId, editForm);
      setEditId(null);
      load();
    } catch (e: unknown) {
      alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error updating challenge');
    } finally {
      setSaving(false);
    }
  };

  const quickClose = async (id: string) => {
    try {
      await updateChallenge(id, { status: 'closed' });
      load();
    } catch {}
  };

  const totalPts = challenges.reduce((s, c) => s + c.points, 0);
  const open = challenges.filter(c => c.status === 'open').length;
  const urgent = challenges.filter(c => c.priority === 'urgent').length;

  if (loading) return <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 40 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Challenges', val: challenges.length, color: '#1a00d9' },
          { label: 'Open', val: open, color: '#1f8a5b' },
          { label: 'Urgent', val: urgent, color: '#fe6e06' },
          { label: 'Total Points Pool', val: totalPts.toLocaleString(), color: '#2a6fdb' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 140, background: '#fff', border: '1px solid #e7edf8', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9aa3b5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 110px 150px', padding: '12px 20px', background: '#f6f8fc', borderBottom: '1px solid #e7edf8', fontSize: 11, fontWeight: 700, color: '#9aa3b5', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          <span>Challenge</span><span style={{ textAlign: 'center' }}>Status</span><span style={{ textAlign: 'center' }}>Entries</span><span style={{ textAlign: 'right' }}>Points</span><span style={{ textAlign: 'right' }}>Due</span><span style={{ textAlign: 'right' }}>Actions</span>
        </div>
        {challenges.map(c => {
          const key = c.priority === 'urgent' ? 'urgent' : c.status;
          const { bg, fg } = STATUS_STYLE[key] ?? { bg: '#f0f3fa', fg: '#5e6d8a' };
          const isEditing = editId === c.id;
          return (
            <div key={c.id}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 110px 150px', padding: '14px 20px', borderBottom: isEditing ? 'none' : '1px solid #f0f3fa', alignItems: 'center', background: isEditing ? '#f6f9ff' : undefined }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: '#9aa3b5' }}>{c.category}</div>
                </div>
                <span style={{ textAlign: 'center' }}>
                  <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' }}>
                    {c.priority === 'urgent' ? 'Urgent' : c.status}
                  </span>
                </span>
                <span style={{ textAlign: 'center', color: '#69748c', fontSize: 13 }}>{c.entry_count ?? 0}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: '#1a00d9', fontSize: 13 }}>{c.points}</span>
                <span style={{ textAlign: 'right', fontSize: 12, color: '#9aa3b5' }}>
                  {c.due_date ? new Date(c.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => isEditing ? cancelEdit() : startEdit(c)}
                    style={{ background: isEditing ? '#f0f3fa' : '#eaf0ff', color: isEditing ? '#69748c' : '#1a00d9', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  {!isEditing && c.status === 'open' && (
                    <button
                      onClick={() => quickClose(c.id)}
                      style={{ background: '#f0f3fa', color: '#5e6d8a', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {isEditing && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f3fa', background: '#f6f9ff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px', gap: 12, alignItems: 'end' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9aa3b5', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Title</div>
                      <input
                        style={inp}
                        value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9aa3b5', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Status</div>
                      <select style={sel} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as 'open' | 'closed' }))}>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9aa3b5', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Priority</div>
                      <select style={sel} value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as 'normal' | 'urgent' }))}>
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9aa3b5', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Due Date</div>
                      <input
                        type="date"
                        style={inp}
                        value={editForm.due_date}
                        onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      style={{ background: '#1a00d9', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{ background: '#f0f3fa', color: '#69748c', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {challenges.length === 0 && <div style={{ textAlign: 'center', color: '#9aa3b5', padding: 32 }}>No challenges yet.</div>}
      </div>
    </div>
  );
}
