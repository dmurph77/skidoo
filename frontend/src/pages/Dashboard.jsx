import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Chat from '../components/ui/Chat';

function urgencyColor(h) {
  if (h == null) return 'var(--amber)';
  if (h < 6) return 'var(--red-pencil)';
  if (h < 24) return 'var(--amber)';
  return 'var(--green-pencil)';
}

function useCountdown(deadline) {
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!deadline) return;
    const calc = () => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) return setTimeLeft({ d: 0, h: 0, m: 0, s: 0, total: 0 });
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d, h, m, s, total: diff });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return timeLeft;
}

function WeekCTA({ openWeek, sub }) {
  const timeLeft = useCountdown(openWeek.deadline);
  const color = urgencyColor(openWeek.hoursLeft);
  const submitted = sub?.submitted;
  const pct = openWeek.totalPlayers > 0
    ? Math.round((openWeek.submittedCount / openWeek.totalPlayers) * 100)
    : 0;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="score-card" style={{ marginBottom: 16, borderColor: submitted ? '#2a7a4a' : color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span className="badge badge-amber">OPEN</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 2 }}>
              {openWeek.label?.toUpperCase()}
            </span>
          </div>

          {/* Submission status */}
          {submitted ? (
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 17, color: 'var(--green-pencil)', marginBottom: 6 }}>
              ✓ {sub.wasRandyd ? 'RANDY SUBMITTED FOR YOU' : `${sub.picksCount} PICKS LOCKED IN`}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 17, color, marginBottom: 6 }}>
              YOU HAVEN'T SUBMITTED YET
            </div>
          )}

          {/* Live countdown */}
          {timeLeft && timeLeft.total > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 6 }}>
                TIME UNTIL DEADLINE
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                {timeLeft.d > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color, lineHeight: 1 }}>{timeLeft.d}</div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--green-text)', letterSpacing: 1 }}>DAY{timeLeft.d !== 1 ? 'S' : ''}</div>
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color, lineHeight: 1 }}>{pad(timeLeft.h)}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--green-text)', letterSpacing: 1 }}>HRS</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--green-text)', lineHeight: 1, marginBottom: 2 }}>:</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color, lineHeight: 1 }}>{pad(timeLeft.m)}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--green-text)', letterSpacing: 1 }}>MIN</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--green-text)', lineHeight: 1, marginBottom: 2 }}>:</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color, lineHeight: 1 }}>{pad(timeLeft.s)}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--green-text)', letterSpacing: 1 }}>SEC</div>
                </div>
              </div>
            </div>
          )}
          {timeLeft && timeLeft.total === 0 && (
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--red-pencil)', letterSpacing: 2, marginBottom: 8 }}>
              DEADLINE PASSED
            </div>
          )}

          {/* League submission progress */}
          {openWeek.totalPlayers > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2 }}>
                  LEAGUE SUBMISSIONS
                </div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--text-secondary)', letterSpacing: 1 }}>
                  {openWeek.submittedCount}/{openWeek.totalPlayers}
                </div>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                <div style={{
                  height: 4, borderRadius: 2,
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, var(--amber-dim), var(--amber))`,
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
          )}

          {/* Commissioner notes */}
          {openWeek.notes && (
            <div style={{ padding: '8px 12px', background: 'var(--elevated)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--amber-dim)' }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber-pencil)', letterSpacing: 2, marginBottom: 3 }}>
                COMMISSIONER NOTE
              </div>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--text-secondary)' }}>
                {openWeek.notes}
              </div>
            </div>
          )}
        </div>

        <Link
          to={`/picks/${openWeek.week}`}
          className={`btn ${submitted ? 'btn-ghost' : 'btn-primary'}`}
          style={{ flexShrink: 0 }}
        >
          {submitted ? (sub.isLocked ? 'VIEW PICKS' : 'EDIT PICKS') : 'SUBMIT PICKS →'}
        </Link>
      </div>
    </div>
  );
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
        <div className="page-subtitle">2026 SEASON · PICK'EM LEAGUE</div>
      </div>

      {/* ── WEEK CTA ── */}
      {openWeek && <WeekCTA openWeek={openWeek} sub={sub} />}
      {!openWeek && (
        <div className="score-card" style={{ marginBottom: 16, padding: '14px 20px', opacity: 0.7 }}>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 2 }}>
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
          <div className="stat-number" style={{ color: myRank ? 'var(--amber-pencil)' : 'var(--green-text)' }}>
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
                {p.userId === user?._id && <span className="badge badge-amber" style={{ fontSize: 13 }}>YOU</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>
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
                {myRank.displayName} <span className="badge badge-amber" style={{ fontSize: 13 }}>YOU</span>
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
          <Link to="/explore?tab=teams" className="btn btn-ghost btn-sm">FULL GRID →</Link>
        </div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 1, marginBottom: 10 }}>
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
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1, marginTop: 6, textAlign: 'right' }}>
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
