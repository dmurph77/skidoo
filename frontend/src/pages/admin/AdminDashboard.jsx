import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING...</div>
    </div>
  );

  const { stats, missingPlayers, weeks } = data;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">COMMISSIONER</h1>
        <div className="page-subtitle">68 SKI-DOO 2026 · ADMIN PANEL</div>
      </div>

      <div className="stat-strip">
        <div className="stat-cell">
          <div className="stat-number">{stats.totalPlayers}</div>
          <div className="stat-label">PLAYERS</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number red">{stats.pendingVerification}</div>
          <div className="stat-label">UNVERIFIED</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number dim">{stats.activeInvites}</div>
          <div className="stat-label">ACTIVE INVITES</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number" style={{ color: 'var(--amber)' }}>
            {stats.openWeek ? `W${stats.openWeek === 1 ? '0/1' : stats.openWeek}` : '—'}
          </div>
          <div className="stat-label">OPEN WEEK</div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { to: '/admin/invites', icon: '✉', label: 'SEND INVITES',    sub: 'Add new players to the league' },
          { to: '/admin/weeks',   icon: '◎', label: 'MANAGE WEEKS',    sub: 'Open weeks, set deadlines' },
          { to: '/admin/users',   icon: '◉', label: 'MANAGE PLAYERS',  sub: 'View and edit accounts' },
        ].map(({ to, icon, label, sub }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <div
              className="score-card"
              style={{ cursor: 'pointer', transition: 'border-color 0.15s', height: '100%' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber-dim)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: 'var(--amber)' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', marginTop: 4, letterSpacing: 1 }}>{sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Scoring shortcut for scored/open weeks */}
      {stats.latestScoredWeek && (
        <div className="score-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2 }}>SCORING PANEL</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', marginTop: 3, letterSpacing: 1 }}>
                LAST SCORED: WEEK {stats.latestScoredWeek === 1 ? '0/1' : stats.latestScoredWeek}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {stats.openWeek && (
                <Link to={`/admin/scoring/${stats.openWeek}`} className="btn btn-primary btn-sm">
                  SCORE WK {stats.openWeek === 1 ? '0/1' : stats.openWeek} →
                </Link>
              )}
              <Link to={`/admin/scoring/${stats.latestScoredWeek}`} className="btn btn-ghost btn-sm">
                VIEW WK {stats.latestScoredWeek === 1 ? '0/1' : stats.latestScoredWeek}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Missing players alert */}
      {stats.openWeek && (
        <div className="score-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: missingPlayers.length > 0 ? 'var(--red-score)' : '#4ab870' }}>
              WEEK {stats.openWeek === 1 ? '0/1' : stats.openWeek} SUBMISSIONS
            </div>
            <span className={`badge ${missingPlayers.length > 0 ? 'badge-red' : 'badge-green'}`}>
              {missingPlayers.length > 0 ? `${missingPlayers.length} MISSING` : 'ALL IN'}
            </span>
          </div>
          {missingPlayers.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-scoreboard)', color: '#4ab870', fontSize: 12, letterSpacing: 1 }}>
              ✓ ALL PLAYERS HAVE SUBMITTED FOR THIS WEEK
            </div>
          ) : (
            missingPlayers.map(p => (
              <div key={p._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-condensed)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>{p.displayName}</span>
                <span style={{ color: 'var(--green-text)', fontSize: 13 }}>@{p.username}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Week grid */}
      <div className="score-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2 }}>SEASON WEEKS</div>
          <Link to="/admin/weeks" className="btn btn-ghost btn-sm">CONFIGURE →</Link>
        </div>
        {weeks.length === 0 ? (
          <div className="empty-state">
            <p>NO WEEKS CONFIGURED — GO TO MANAGE WEEKS TO SET UP THE SEASON</p>
          </div>
        ) : (
          weeks.map(w => (
            <div key={w.week} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--amber)', width: 44 }}>
                  {w.week === 1 ? '0/1' : w.week}
                </span>
                <div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700 }}>
                    {w.label || `WEEK ${w.week === 1 ? '0/1' : w.week}`}
                  </div>
                  {w.deadline && (
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1 }}>
                      DEADLINE: {new Date(w.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {w.isOpen   && <span className="badge badge-amber">OPEN</span>}
                {w.isScored && <span className="badge badge-green">SCORED</span>}
                {!w.isOpen && !w.isScored && w.deadline && <span className="badge badge-gray">UPCOMING</span>}
                <Link to={`/admin/scoring/${w.week}`} className="btn btn-ghost btn-sm">SCORE</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
