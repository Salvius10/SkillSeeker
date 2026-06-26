import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, register as apiRegister } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [role, setRole] = useState<'employee' | 'admin'>('employee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let data;
      if (mode === 'login') {
        data = await apiLogin(email, password);
      } else {
        data = await apiRegister({ email, password, name, team, role });
      }
      login(data.token, data.user);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = { height: 44, border: '1px solid #e2e8f4', borderRadius: 10, padding: '0 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#3a4561', marginBottom: 6, display: 'block' };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', border: '1px solid #e7edf8', borderRadius: 20, padding: 40, width: 400, boxShadow: '0 4px 24px rgba(26,0,217,0.08)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fe6e06', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 20 }}>S</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Skill Seeker</div>
            <div style={{ fontSize: 11, color: '#9aa3b5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Challenge Hub</div>
          </div>
        </div>

        <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 800 }}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <>
              <div><label style={lbl}>Name</label><input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Sam Okafor" required /></div>
              <div><label style={lbl}>Team</label><input style={inp} value={team} onChange={e => setTeam(e.target.value)} placeholder="Platform Team" /></div>
              <div>
                <label style={lbl}>Role</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['employee', 'admin'] as const).map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)} style={{ flex: 1, height: 44, border: `1px solid ${role === r ? '#1a00d9' : '#e2e8f4'}`, borderRadius: 10, background: role === r ? '#1a00d9' : '#fff', color: role === r ? '#fff' : '#69748c', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{r}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div><label style={lbl}>Email</label><input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required /></div>
          <div><label style={lbl}>Password</label><input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></div>

          {error && <div style={{ fontSize: 13, color: '#d32f2f', background: '#fee7e0', borderRadius: 8, padding: '10px 14px' }}>{error}</div>}

          <button type="submit" disabled={loading} style={{ height: 48, background: '#1a00d9', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1, boxShadow: '0 2px 10px rgba(26,0,217,0.25)' }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#69748c' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={{ background: 'none', border: 'none', color: '#1a00d9', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
