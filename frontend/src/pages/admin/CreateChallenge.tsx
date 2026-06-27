import { useState, type FormEvent } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { createChallenge } from '../../api/client';

const C = {
  primary: '#1a00d9',
  orange: '#fe6e06',
  surface: '#ffffff',
  surfaceLow: '#f2f3ff',
  border: '#dae2fd',
  text: '#131b2e',
  textSec: '#454556',
  textMuted: '#767588',
  sans: "'Hanken Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

interface Props { onCreated: () => void; }

const inp: React.CSSProperties = {
  height: 44,
  border: '1px solid #dae2fd',
  borderRadius: 10,
  padding: '0 14px',
  fontSize: 14,
  fontFamily: C.sans,
  outline: 'none',
  width: '100%',
  background: C.surface,
  color: C.text,
  transition: 'border-color 0.15s',
};

export default function CreateChallenge({ onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [points, setPoints] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !description || !points) { setError('Title, description and points are required'); return; }
    setError('');
    setLoading(true);
    try {
      await createChallenge({ title, description, points, due_date: dueDate || undefined, priority, status: 'open', category: category || undefined });
      onCreated();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error creating challenge');
    } finally {
      setLoading(false);
    }
  };

  const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: C.textMuted, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: C.mono };

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ background: C.surface, border: '1px solid #dae2fd', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(26,0,217,0.06)' }}>
        {/* Header strip */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #0f0099, #1a00d9, #fe6e06)' }} />
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={lbl}>Challenge Title</label>
            <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Reduce inference latency by 40%" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={lbl}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the problem, success criteria, and any constraints…"
              style={{ minHeight: 130, border: '1px solid #dae2fd', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: C.sans, lineHeight: 1.65, resize: 'vertical', outline: 'none', background: C.surface, color: C.text }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={lbl}>Points Reward</label>
              <input style={inp} type="number" min={1} value={points} onChange={e => setPoints(e.target.value)} placeholder="e.g. 400" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={lbl}>Category</label>
              <input style={inp} value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Coding, Research…" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={lbl}>Due Date</label>
              <input style={inp} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={lbl}>Priority</label>
              <select
                style={{ ...inp, cursor: 'pointer' }}
                value={priority}
                onChange={e => setPriority(e.target.value as 'normal' | 'urgent')}
              >
                <option value="normal">Normal</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
          </div>

          {priority === 'urgent' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff3e8', border: '1px solid rgba(254,110,6,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#b45309' }}>
              <AlertTriangle size={15} color='#fe6e06' />
              Urgent challenges appear prominently and send priority notifications.
            </div>
          )}

          {error && (
            <div style={{ fontSize: 13, color: '#d32f2f', background: '#fee7e0', border: '1px solid rgba(211,47,47,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={14} color='#d32f2f' />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              onClick={submit}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, fontFamily: C.sans, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 10px rgba(26,0,217,0.25)', opacity: loading ? 0.8 : 1 }}
            >
              <Plus size={16} />
              {loading ? 'Publishing…' : 'Publish Challenge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
