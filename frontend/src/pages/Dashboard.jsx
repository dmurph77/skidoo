import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Chat from '../components/ui/Chat';

function hoursLabel(h) {
  if (h == null) return '';
  if (h < 1) return 'LESS THAN 1 HOUR LEFT';
  if (h < 24) return `${Math.floor(h)} HOURS LEFT`;
  return `${Math.floor(h / 24)} DAYS LEFT`;
}

function urgencyColor(h) {
  if (h == null) return 'var(--amber)';
  if (h < 6) return '#e05c5c';
  if (h < 24) return 'var(--amber)';
  return '#4ab870';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState(null);
  const [weekStatus, setWeekStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/picks/leaderboard').catch(() => ({ data: null })),
      api.get('/picks/current-week-status').catch(() => ({ data: null })),
    ]).then(([lbRes, wsRes]) => {
      setLeaderboard(lbRes.data);
      setWeekStatus(wsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash">68 SKI-DOO</div>
    </div>
  );

  const openWeek = weekStatus?.openWeek;
  const sub = weekStatus?.submission;
  const top5 = (leaderboard?.seasonStandings || []).slice(0, 5);
  const myRank = leaderboard?.seasonStandings?.find(p => p.userId === user?._id);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">68 SKI-DOO</h1>
        <div className="page-subtitle">2025 SEASON · PICK'EM LEAGUE</div>
      </div>

      {/* ── WEEK CTA ── */}
      {openWeek && (
        <div className="score-card" style={{
          marginBottom: 16,
          borderColor: sub?.submitted ? '#2a7a4a' : urgencyColor(openWeek.hoursLeft),
          borderWidth: 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span className="badge badge-amber">OPEN</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 2 }}>
                  {openWeek.label?.toUpperCase()}
                </span>
              </div>

              {sub?.submitted ? (
                <div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 17, color: '#4ab870', display: 'flex', alignItems: 'center', gap: 8 }}>
                    ✓ {sub.wasRandyd ? "RANDY SUBMITTED FOR YOU" : `YOU'VE SUBMITTED ${sub.picksCount} PICKS`}
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1, marginTop: 3 }}>
                    {sub.isLocked ? 'LOCKED · AWAITING RESULTS' : `DEADLINE: ${new Date(openWeek.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}`}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 17, color: urgencyColor(openWeek.hoursLeft) }}>
                    YOU HAVEN'T SUBMITTED YET
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: urgencyColor(openWeek.hoursLeft), letterSpacing: 1, marginTop: 3 }}>
                    {hoursLabel(openWeek.hoursLeft)} · DEADLINE {new Date(openWeek.deadline).toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).toUpperCase()}
                  </div>
                </div>
              )}

              {/* Commissioner notes */}
              {openWeek.notes && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--elevated)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--amber-dim)' }}>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--amber)', letterSpacing: 2, marginBottom: 3 }}>
                    COMMISSIONER NOTE
                  </div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--cream-dim)' }}>
                    {openWeek.notes}
                  </div>
                </div>
              )}
            </div>

            <Link
              to={`/picks/${openWeek.week}`}
              className={`btn ${sub?.submitted && !sub?.isLocked ? 'btn-ghost' : sub?.submitted ? 'btn-ghost' : 'btn-primary'}`}
              style={{ flexShrink: 0 }}
            >
              {sub?.submitted ? (sub.isLocked ? 'VIEW PICKS' : 'EDIT PICKS') : `SUBMIT PICKS →`}
            </Link>
          </div>
        </div>
      )}

      {/* No open week */}
      {!openWeek && (
        <div className="score-card" style={{ marginBottom: 16, padding: '14px 20px', opacity: 0.7 }}>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2 }}>
            NO WEEK CURRENTLY OPEN · CHECK BACK SOON
          </div>
        </div>
      )}

      {/* ── STAT STRIP ── */}
      <div className="stat-strip">
        <div className="stat-cell">
          <div className="stat-number">{user?.seasonPoints || 0}</div>
          <div className="stat-label">SEASON PTS</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number" style={{ color: myRank ? 'var(--amber)' : 'var(--green-text)' }}>
            {myRank ? `#${myRank.rank}` : '—'}
          </div>
          <div className="stat-label">RANK</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number dim">{user?.usedTeams?.length || 0}/68</div>
          <div className="stat-label">TEAMS USED</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number dim">{68 - (user?.usedTeams?.length || 0)}</div>
          <div className="stat-label">REMAINING</div>
        </div>
      </div>

      {/* ── LEADERBOARD MINI ── */}
      <div className="score-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3 }}>STANDINGS</div>
          <Link to="/leaderboard" className="btn btn-ghost btn-sm">FULL BOARD →</Link>
        </div>
        {top5.map((p, i) => (
          <div key={p.userId} className={`board-row ${p.userId === user?._id ? 'is-me' : ''}`}>
            <div className="board-rank">{p.rank}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15, display: 'flex', gap: 8, alignItems: 'center' }}>
                {p.displayName}
                {p.userId === user?._id && <span className="badge badge-amber" style={{ fontSize: 9 }}>YOU</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1 }}>
                {p.teamsUsed}/68 TEAMS USED
              </div>
            </div>
            <div className="board-points">{p.seasonPoints}</div>
          </div>
        ))}
        {top5.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🏈</span>
            <p>STANDINGS APPEAR AFTER WEEK 1 IS SCORED</p>
          </div>
        )}
        {/* Show my rank if not in top 5 */}
        {myRank && myRank.rank > 5 && (
          <div className="board-row is-me" style={{ marginTop: 4, borderTop: '1px dashed var(--border)' }}>
            <div className="board-rank">{myRank.rank}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15 }}>
                {myRank.displayName} <span className="badge badge-amber" style={{ fontSize: 9 }}>YOU</span>
              </div>
            </div>
            <div className="board-points">{myRank.seasonPoints}</div>
          </div>
        )}
      </div>

      {/* ── TEAMS REMAINING MINI ── */}
      <div className="score-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3 }}>YOUR TEAMS</div>
          <Link to="/teams" className="btn btn-ghost btn-sm">FULL GRID →</Link>
        </div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1, marginBottom: 10 }}>
          {68 - (user?.usedTeams?.length || 0)} OF 68 TEAMS REMAINING
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
          <div style={{
            height: 6, borderRadius: 3,
            width: `${((user?.usedTeams?.length || 0) / 68) * 100}%`,
            background: `linear-gradient(90deg, var(--amber-dim), var(--amber))`,
            transition: 'width 0.5s',
          }} />
        </div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginTop: 6, textAlign: 'right' }}>
          {user?.usedTeams?.length || 0} USED
        </div>
      </div>

      {/* ── CHAT ── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3, color: 'var(--cream)', marginBottom: 12 }}>LEAGUE CHAT</div>
        <Chat />
      </div>
    </div>
  );
}
