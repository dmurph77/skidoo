import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!token) return setError('Missing reset token — use the link from your email');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed — your link may have expired');
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">68</div>
        <div className="auth-title">SKI-DOO</div>
        <div className="alert alert-error">INVALID RESET LINK — USE THE LINK FROM YOUR EMAIL</div>
        <Link to="/forgot-password" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>REQUEST NEW LINK</Link>
      </div>
    </div>
  );

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">68</div>
        <div className="auth-title">SKI-DOO</div>
        <div className="auth-subtitle">RESET PASSWORD</div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--green-pencil)', marginBottom: 10, letterSpacing: 2 }}>
              PASSWORD UPDATED
            </div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 1 }}>
              REDIRECTING TO LOGIN...
            </div>
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">NEW PASSWORD</label>
              <input
                className="form-input"
                type="password"
                placeholder="MINIMUM 8 CHARACTERS"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">CONFIRM PASSWORD</label>
              <input
                className="form-input"
                type="password"
                placeholder="REPEAT PASSWORD"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginBottom: 14 }} onClick={handleSubmit} disabled={loading}>
              {loading ? 'SAVING...' : 'SET NEW PASSWORD →'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 1 }}>
                ← BACK TO LOGIN
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
