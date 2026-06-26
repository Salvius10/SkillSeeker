import { useState, type FormEvent } from 'react';
import { createChallenge } from '../../api/client';

interface Props { onCreated: () => void; }

const inp: React.CSSProperties = { height: 44, border: '1px solid #e2e8f4', borderRadius: 10, padding: '0 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', width: '100%' };
const sel: React.CSSProperties = { ...inp, background: '#fff', cursor: 'pointer' };
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#3a4561', marginBottom: 6, display: 'block' };

export default function CreateChallenge({ onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Infrastructure');
  const [points, setPoints] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent, status: 'open' | 'draft' = 'open') => {
    e.preventDefault();
    if (!title || !description || !points) { setError('Title, description and points are required'); return; }
    setError('');
    setLoading(true);
    try {
      await createChallenge({ title, description, category, points, due_date: dueDate || undefined, priority, status: status === 'draft' ? 'closed' : 'open' });
      onCreated();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error creating challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', border: '1px solid #e7edf8', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={lbl}>Title</label>
        <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Reduce inference latency by 40%" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={lbl}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the problem, the success criteria, and any constraints…" style={{ minHeight: 120, border: '1px solid #e2e8f4', borderRadius: 10, padding: 14, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', outline: 'none' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Category</label>
          <select style={sel} value={category} onChange={e => setCategory(e.target.value)}>
            {['Infrastructure', 'ML', 'Frontend', 'Data', 'Security', 'Backend', 'DevOps', 'General'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Points</label>
          <input style={inp} type="number" min={1} value={points} onChange={e => setPoints(e.target.value)} placeholder="e.g. 400" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Due Date</label>
          <input style={inp} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={lbl}>Priority</label>
          <select style={sel} value={priority} onChange={e => setPriority(e.target.value as 'normal' | 'urgent')}>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      {error && <div style={{ fontSize: 13, color: '#d32f2f', background: '#fee7e0', borderRadius: 8, padding: '10px 14px' }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
        <button onClick={e => submit(e, 'draft')} disabled={loading} style={{ background: '#f6f8fc', color: '#69748c', border: '1px solid #e7edf8', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>Save draft</button>
        <button onClick={e => submit(e, 'open')} disabled={loading} style={{ background: '#1a00d9', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 2px 10px rgba(26,0,217,0.25)' }}>
          {loading ? 'Publishing…' : 'Publish challenge'}
        </button>
      </div>
    </div>
  );
}
