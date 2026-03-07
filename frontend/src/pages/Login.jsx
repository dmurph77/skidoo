import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Decorative scoreboard ticker */}
        <div style={{
          fontFamily: 'var(--font-scoreboard)', fontSize: 11,
          color: 'var(--green-text)', letterSpacing: 3,
          textAlign: 'center', marginBottom: 20,
          textTransform: 'uppercase'
        }}>
          ◄ 2026 SEASON · MURPHDUNKS.COM ►
        </div>

        <div className="auth-board">
          <div className="auth-header">
            <span className="auth-title">68</span>
            <span className="auth-title">SKI-DOO</span>
            <span className="auth-subtitle">2026 COLLEGE FOOTBALL PICK'EM</span>
          </div>

          <div className="auth-body">
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">EMAIL ADDRESS</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">PASSWORD</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
              <button
                className="btn btn-primary btn-full btn-lg"
                type="submit" disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading ? 'SIGNING IN...' : 'SIGN IN →'}
              </button>
            </form>

            <div style={{
              marginTop: 20, paddingTop: 20,
              borderTop: '1px solid var(--border)',
              fontFamily: 'var(--font-scoreboard)', fontSize: 12,
              color: 'var(--green-text)', textAlign: 'center', letterSpacing: 1
            }}>
              NEED AN ACCOUNT?{' '}
              <span style={{ color: 'var(--amber)' }}>
                CONTACT THE COMMISSIONER FOR AN INVITE.
              </span>
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Link to="/forgot-password" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1 }}>
                FORGOT PASSWORD?
              </Link>
            </div>
          </div>
        </div>

        {/* Season stats footer */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8, marginTop: 16,
        }}>
          {[['68', 'TEAMS'], ['14', 'WEEKS'], ['$70', 'ENTRY']].map(([num, label]) => (
            <div key={label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              padding: '10px 8px', textAlign: 'center', borderRadius: 'var(--radius)'
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--amber)', lineHeight: 1 }}>{num}</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
