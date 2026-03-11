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
          fontFamily: 'var(--font-scoreboard)', fontSize: 14,
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
                  placeholder="your password"
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
              borderTop: '1px solid var(--rule-dark)',
              fontFamily: 'var(--font-scoreboard)', fontSize: 13,
              color: 'var(--ink-faint)', textAlign: 'center',
            }}>
              <div style={{ marginBottom: 10 }}>
                NEW TO 68 SKI-DOO?{' '}
                <a href="mailto:skidoobot@gmail.com" style={{ color: 'var(--red-pencil)', fontWeight: 700, textDecoration: 'underline' }}>
                  Email the commissioner to get set up →
                </a>
              </div>
              <div style={{ fontSize: 15, color: 'var(--ink-ghost)' }}>
                Already have an invite?{' '}
                <Link to="/register" style={{ color: 'var(--blue-pencil)' }}>
                  Click here to create your account
                </Link>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 12, display: 'flex', justifyContent: 'center', gap: 24 }}>
              <Link to="/forgot-password" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--ink-ghost)' }}>
                Forgot password?
              </Link>
              <Link to="/standings" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--ink-ghost)' }}>
                View standings
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
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Quick pitch */}
        <div style={{
          marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '18px 16px',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: 3, color: 'var(--amber)', marginBottom: 12 }}>
            HOW IT WORKS
          </div>
          {[
            ['◎', 'Pick 4–5 college teams each week to win (or pull an upset).'],
            ['⚡', 'Upset picks score 2 pts. Win picks score 1 pt.'],
            ['🚫', 'Each team can only be used once all season. 68 teams, 68 picks.'],
            ['🎲', 'Miss the deadline? Randy the Randomizer picks for you.'],
          ].map(([icon, text]) => (
            <div key={icon} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--text-secondary)', letterSpacing: 0.5, lineHeight: 1.7 }}>{text}</span>
            </div>
          ))}
          <Link
            to="/how-to-play"
            style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--amber)', letterSpacing: 2, marginTop: 4, display: 'inline-block' }}
          >
            FULL RULES & STRATEGY →
          </Link>
        </div>
      </div>
    </div>
  );
}
