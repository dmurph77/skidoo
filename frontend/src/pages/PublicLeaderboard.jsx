import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '/api';

function Sparkline({ weeklyPoints, width = 60, height = 22 }) {
  if (!weeklyPoints || weeklyPoints.length < 2) return null;
  const pts = weeklyPoints.map(w => w.points);
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const range = max - min || 1;
  const step = width / (pts.length - 1);
  const points = pts.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const color = last >= prev ? '#4ab870' : '#e05c5c';
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
      <circle cx={(pts.length - 1) * step} cy={height - ((last - min) / range) * height} r="2.5" fill={color} />
    </svg>
  );
}

export default function PublicLeaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/picks/leaderboard/public`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load standings'); setLoading(false); });
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ background: 'var(--green-dark)', borderBottom: '4px solid var(--amber)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 4, color: 'var(--amber)' }}>68 SKI-DOO</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 3, marginTop: 2 }}>
            2025 COLLEGE FOOTBALL PICK'EM
          </div>
        </div>
        <Link to="/login" className="btn btn-primary btn-sm">SIGN IN →</Link>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

        {/* Page title */}
        <div className="page-header">
          <h1 className="page-title">STANDINGS</h1>
          <div className="page-subtitle">
            {data?.lastScoredWeek ? `UPDATED THROUGH ${data.lastScoredWeek.toUpperCase()}` : 'SEASON IN PROGRESS'}
          </div>
        </div>

        {loading && (
          <div className="score-card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--amber)', animation: 'flicker 1.5s ease-in-out infinite' }}>LOADING...</div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {data && data.seasonStandings.length === 0 && (
          <div className="score-card">
            <div className="empty-state">
              <span className="empty-icon">🏈</span>
              <p>SEASON HASN'T STARTED YET — CHECK BACK WEEK 1</p>
            </div>
          </div>
        )}

        {data && data.seasonStandings.length > 0 && (
          <>
            {/* Podium top 3 */}
            {data.seasonStandings.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[1, 0, 2].map((idx) => {
                  const p = data.seasonStandings[idx];
                  const colors = ['var(--amber)', '#c0c0c0', '#cd7f32'];
                  return (
                    <div key={idx} className="score-card" style={{
                      textAlign: 'center', padding: '16px 10px',
                      borderColor: idx === 0 ? 'var(--amber-dim)' : 'var(--border)',
                      marginTop: idx === 1 ? 0 : 16,
                    }}>
                      <div style={{ fontSize: idx === 0 ? 30 : 22 }}>{medals[idx]}</div>
                      <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, marginTop: 8 }}>
                        {p.displayName}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: idx === 0 ? 38 : 28, color: colors[idx], lineHeight: 1, marginTop: 4 }}>
                        {p.seasonPoints}
                      </div>
                      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>PTS</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <div className="score-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2 }}>FULL STANDINGS</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, alignSelf: 'center' }}>
                  {data.seasonStandings.length} PLAYERS
                </div>
              </div>
              {data.seasonStandings.map((p, i) => (
                <div key={p.username} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderBottom: i < data.seasonStandings.length - 1 ? '1px solid var(--border)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: i < 3 ? 22 : 16,
                    color: i === 0 ? 'var(--amber)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--green-text)',
                    width: 30, flexShrink: 0, textAlign: 'center',
                  }}>
                    {i < 3 ? medals[i] : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
                      {p.displayName}
                    </div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginTop: 1 }}>
                      {p.teamsUsed}/68 TEAMS USED
                    </div>
                    {p.weeklyPoints?.length >= 2 && (
                      <div style={{ marginTop: 4 }}>
                        <Sparkline weeklyPoints={p.weeklyPoints} width={60} height={18} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--amber)', flexShrink: 0 }}>
                    {p.seasonPoints}
                  </div>
                </div>
              ))}
            </div>

            {/* Last updated */}
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, textAlign: 'center', marginTop: 16 }}>
              LAST UPDATED {new Date(data.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}
            </div>
          </>
        )}

        {/* Join CTA */}
        <div className="score-card" style={{ marginTop: 24, textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 3, marginBottom: 8 }}>
            WANT IN?
          </div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 20 }}>
            CONTACT THE COMMISSIONER FOR AN INVITE
          </div>
          <Link to="/login" className="btn btn-primary">SIGN IN →</Link>
        </div>
      </div>
    </div>
  );
}
