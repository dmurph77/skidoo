import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Chat from '../components/ui/Chat';

function WeekGrid({ weeks, myHistory }) {
  const submittedWeeks = new Set((myHistory || []).map(h => h.week));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
      {Array.from({ length: 14 }, (_, i) => i + 1).map(w => {
        const cfg = weeks.find(wk => wk.week === w);
        const sub = myHistory?.find(h => h.week === w);
        const label = w === 1 ? '0/1' : `${w}`;

        let borderColor = 'var(--border)';
        let textColor = 'var(--green-text)';
        let bg = 'var(--elevated)';

        if (cfg?.isOpen) { borderColor = 'var(--amber)'; textColor = 'var(--amber)'; bg = 'rgba(245,166,35,0.06)'; }
        else if (cfg?.isScored && sub) { borderColor = '#2a7a4a'; textColor = '#4ab870'; bg = 'rgba(42,122,74,0.06)'; }
        else if (sub && !cfg?.isScored) { borderColor = 'var(--green-border)'; textColor = 'var(--cream-dim)'; }

        const to = cfg?.isOpen || sub ? `/picks/${w}` : null;
        const inner = (
          <div style={{
            border: `1px solid ${borderColor}`, borderRadius: 'var(--radius)',
            padding: '8px 4px', textAlign: 'center', background: bg,
            cursor: to ? 'pointer' : 'default', transition: 'all 0.12s',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: textColor, lineHeight: 1 }}>
              {label}
            </div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginTop: 3 }}>
              {cfg?.isOpen ? 'OPEN' : cfg?.isScored && sub ? `${sub.totalPoints}pt` : sub ? 'SUBM' : 'WK'}
            </div>
          </div>
        );

        return to ? <Link key={w} to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : <div key={w}>{inner}</div>;
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/picks/weeks'),
      api.get('/picks/my-history'),
      api.get('/picks/leaderboard'),
    ]).then(([weeksRes, histRes, boardRes]) => {
      setData({
        weeks: weeksRes.data.weeks || [],
        history: histRes.data.history || [],
        leaderboard: boardRes.data,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 32 }}>LOADING...</div>
    </div>
  );

  const { weeks, history, leaderboard } = data;
  const openWeek = weeks.find(w => w.isOpen);
  const myRank = leaderboard?.seasonStandings?.findIndex(s => s.userId === user?._id) + 1;
  const myPoints = leaderboard?.seasonStandings?.find(s => s.userId === user?._id)?.seasonPoints || 0;
  const alreadySubmitted = openWeek && history.some(h => h.week === openWeek.week);
  const teamsUsed = user?.usedTeams?.length || 0;

  return (
    <div>
      {/* Email verification banner */}
      {!user?.emailVerified && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          ⚠ PLEASE VERIFY YOUR EMAIL ADDRESS TO SUBMIT PICKS.{' '}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => api.post('/auth/resend-verification').then(() => alert('Verification email sent!'))}
          >
            RESEND EMAIL
          </button>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">SCOREBOARD</h1>
        <div className="page-subtitle">2026 SEASON · {user?.displayName?.toUpperCase()}</div>
      </div>

      {/* Stats */}
      <div className="stat-strip">
        <div className="stat-cell">
          <div className="stat-number">{myRank > 0 ? `#${myRank}` : '—'}</div>
          <div className="stat-label">SEASON RANK</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number dim">{myPoints}</div>
          <div className="stat-label">SEASON POINTS</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number cream">{68 - teamsUsed}</div>
          <div className="stat-label">TEAMS LEFT</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number">{history.length}</div>
          <div className="stat-label">WEEKS FILED</div>
        </div>
      </div>

      {/* Open week CTA */}
      {openWeek && (
        <div className="score-card gold" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: 2, color: 'var(--amber)' }}>
                {openWeek.week === 1 ? 'WEEK 0/1' : `WEEK ${openWeek.week}`} PICKS ARE OPEN
              </div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--cream-dim)', marginTop: 4, letterSpacing: 1 }}>
                DEADLINE:{' '}
                {openWeek.deadline
                  ? new Date(openWeek.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()
                  : 'THURSDAY NOON'}
              </div>
              {alreadySubmitted && (
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: '#4ab870', marginTop: 4, letterSpacing: 1 }}>
                  ✓ PICKS SUBMITTED — YOU CAN STILL EDIT BEFORE DEADLINE
                </div>
              )}
            </div>
            <Link
              to={`/picks/${openWeek.week}`}
              className="btn btn-primary btn-lg"
            >
              {alreadySubmitted ? 'EDIT PICKS →' : 'SUBMIT PICKS →'}
            </Link>
          </div>
        </div>
      )}

      {/* Season grid */}
      <div className="score-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2 }}>SEASON SCHEDULE</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 2 }}>
            14 WEEKS · 68 PICKS
          </div>
        </div>
        <WeekGrid weeks={weeks} myHistory={history} />
      </div>

      {/* Mini leaderboard */}
      <div className="score-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2 }}>SEASON STANDINGS</div>
          <Link to="/leaderboard" className="btn btn-ghost btn-sm">FULL BOARD →</Link>
        </div>

        {(leaderboard?.seasonStandings || []).slice(0, 6).map((p, i) => (
          <div
            key={p.userId}
            className={`board-row ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''} ${p.userId === user?._id ? 'is-me' : ''}`}
            style={{ cursor: 'default' }}
          >
            <div className={`board-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
              {i + 1}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-condensed)', letterSpacing: 0.5 }}>
                {p.displayName}
                {p.userId === user?._id && <span className="badge badge-amber" style={{ marginLeft: 8, fontSize: 9 }}>YOU</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1 }}>
                @{p.username} · {p.teamsUsed}/68 TEAMS USED
              </div>
            </div>
            <div className="board-points">{p.seasonPoints}</div>
          </div>
        ))}

        {(leaderboard?.seasonStandings || []).length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🏈</span>
            <p>SEASON STANDINGS WILL APPEAR AFTER WEEK 1 IS SCORED</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3, color: 'var(--cream)', marginBottom: 12 }}>
          LEAGUE CHAT
        </div>
        <Chat />
      </div>
    </div>
  );
}

// Chat section is rendered at bottom — imported above
