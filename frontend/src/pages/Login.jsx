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
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Brand header */}
        <div className="auth-board">
          <div className="auth-header">
            <img src="/logo-light.svg" alt="68 Ski-Doo" style={{ width: 140, height: 'auto', display: 'block', margin: '0 auto' }} />
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

            {/* Secondary links */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--rule-dark)', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center' }}>
                Want to join?{' '}
                <a href="mailto:skidoobot@gmail.com" style={{ color: 'var(--amber-pencil)', fontWeight: 700 }}>
                  Email the commissioner →
                </a>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <Link to="/forgot-password" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--ink-ghost)', letterSpacing: 0.5 }}>
                  Forgot password?
                </Link>
                <Link to="/leaderboard" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--ink-ghost)', letterSpacing: 0.5 }}>
                  View standings
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Season stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
          {[['68', 'TEAMS'], ['14', 'WEEKS'], ['$70', 'ENTRY']].map(([num, label]) => (
            <div key={label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              padding: '12px 8px', textAlign: 'center', borderRadius: 'var(--radius)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--amber)', lineHeight: 1 }}>{num}</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--green-text)', letterSpacing: 2, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ marginTop: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 16px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 3, color: 'var(--amber)', marginBottom: 14 }}>
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
              <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--text-secondary)', letterSpacing: 0.5, lineHeight: 1.7 }}>{text}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--rule-dark)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/how-to-play" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber)', letterSpacing: 1.5 }}>
              FULL RULES & STRATEGY →
            </Link>
            <a href="mailto:skidoobot@gmail.com" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--green-text)', letterSpacing: 1 }}>
              GET AN INVITE
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
