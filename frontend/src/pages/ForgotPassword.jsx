import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) return setError('Enter your email address');
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong — try again');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">68</div>
        <div className="auth-title">SKI-DOO</div>
        <div className="auth-subtitle">FORGOT PASSWORD</div>

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#4ab870', marginBottom: 10, letterSpacing: 2 }}>
              CHECK YOUR EMAIL
            </div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, color: 'var(--cream-dim)', lineHeight: 1.6, marginBottom: 20 }}>
              If that email is registered, you'll get a reset link shortly. It expires in 1 hour.
            </div>
            <Link to="/login" className="btn btn-ghost btn-sm">← BACK TO LOGIN</Link>
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">EMAIL ADDRESS</label>
              <input
                className="form-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginBottom: 14 }} onClick={handleSubmit} disabled={loading}>
              {loading ? 'SENDING...' : 'SEND RESET LINK →'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1 }}>
                ← BACK TO LOGIN
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
