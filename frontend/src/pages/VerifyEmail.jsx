import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-board" style={{ textAlign: 'center' }}>
        <div className="auth-header">
          <span className="auth-title" style={{ fontSize: 36, color: status === 'error' ? 'var(--red-score)' : 'var(--amber)' }}>
            {status === 'verifying' ? 'VERIFYING...' : status === 'success' ? 'VERIFIED ✓' : 'LINK EXPIRED'}
          </span>
          <span className="auth-subtitle">EMAIL VERIFICATION</span>
        </div>
        <div className="auth-body">
          {status === 'success' && (
            <>
              <p style={{ fontFamily: 'var(--font-scoreboard)', color: 'var(--text-secondary)', marginBottom: 20, letterSpacing: 0.5 }}>
                Your email is confirmed. You're in the league.
              </p>
              <Link to="/dashboard" className="btn btn-primary btn-lg">ENTER THE LEAGUE →</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <p style={{ fontFamily: 'var(--font-scoreboard)', color: 'var(--text-secondary)', marginBottom: 20, letterSpacing: 0.5 }}>
                This verification link is invalid or has expired. Log in and request a new one.
              </p>
              <Link to="/login" className="btn btn-outline">← BACK TO LOGIN</Link>
            </>
          )}
          {status === 'verifying' && (
            <div style={{ fontFamily: 'var(--font-scoreboard)', color: 'var(--green-text)', letterSpacing: 3, animation: 'flicker 1.5s infinite' }}>
              CHECKING...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
