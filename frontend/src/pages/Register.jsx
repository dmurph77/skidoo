import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';

  const [inviteStatus, setInviteStatus] = useState('checking'); // checking | valid | invalid
  const [prefillEmail, setPrefillEmail] = useState('');
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', displayName: '', inviteToken });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) { setInviteStatus('invalid'); return; }
    api.post('/auth/validate-invite', { token: inviteToken })
      .then(res => {
        if (res.data.valid) {
          setInviteStatus('valid');
          if (res.data.email) {
            setPrefillEmail(res.data.email);
            setForm(f => ({ ...f, email: res.data.email }));
          }
        } else {
          setInviteStatus('invalid');
        }
      })
      .catch(() => setInviteStatus('invalid'));
  }, [inviteToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  if (inviteStatus === 'checking') {
    return (
      <div className="auth-page">
        <div className="loading-screen" style={{ minHeight: 'auto', padding: 60 }}>
          <div className="logo-flash" style={{ fontSize: 32 }}>VALIDATING INVITE...</div>
        </div>
      </div>
    );
  }

  if (inviteStatus === 'invalid') {
    return (
      <div className="auth-page">
        <div className="auth-board" style={{ textAlign: 'center' }}>
          <div className="auth-header">
            <span className="auth-title" style={{ color: 'var(--red-score)' }}>DENIED</span>
            <span className="auth-subtitle">INVITE REQUIRED</span>
          </div>
          <div className="auth-body">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
            <p style={{ fontFamily: 'var(--font-scoreboard)', color: 'var(--text-secondary)', lineHeight: 1.7, letterSpacing: 0.5 }}>
              {inviteToken
                ? 'This invite link is invalid or has expired.'
                : 'You need a valid invite link to join 68 Ski-Doo.'}
            </p>
            <p style={{ fontFamily: 'var(--font-scoreboard)', color: 'var(--green-text)', fontSize: 15, marginTop: 12, letterSpacing: 1 }}>
              CONTACT THE COMMISSIONER TO GET AN INVITE.
            </p>
            <a href="/login" className="btn btn-outline" style={{ marginTop: 20 }}>← BACK TO LOGIN</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-board" style={{ maxWidth: 460 }}>
        <div className="auth-header">
          <span className="auth-title" style={{ fontSize: 38 }}>JOIN THE</span>
          <span className="auth-title">LEAGUE</span>
          <span className="auth-subtitle">✓ VALID INVITE — CREATE YOUR ACCOUNT</span>
        </div>

        <div className="auth-body">
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="form-group">
                <label className="form-label">DISPLAY NAME</label>
                <input className="form-input" type="text" placeholder="Shown on leaderboard"
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  required maxLength={40}
                />
              </div>
              <div className="form-group">
                <label className="form-label">USERNAME</label>
                <input className="form-input" type="text" placeholder="no spaces"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  required minLength={3} maxLength={30}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">EMAIL ADDRESS</label>
              <input className="form-input" type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                readOnly={!!prefillEmail}
                placeholder="you@example.com"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div className="form-group">
                <label className="form-label">PASSWORD</label>
                <input className="form-input" type="password" placeholder="Min 6 chars"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required minLength={6}
                />
              </div>
              <div className="form-group">
                <label className="form-label">CONFIRM</label>
                <input className="form-input" type="password" placeholder="Again"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                />
              </div>
            </div>

            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
            </button>
          </form>

          <div style={{ marginTop: 16, fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 1, textAlign: 'center' }}>
            A VERIFICATION EMAIL WILL BE SENT TO CONFIRM YOUR ADDRESS
          </div>
        </div>
      </div>
    </div>
  );
}
