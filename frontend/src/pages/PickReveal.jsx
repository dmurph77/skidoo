import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function PickReveal() {
  const { week: weekParam } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(weekParam ? parseInt(weekParam) : null);
  const [weeks, setWeeks] = useState([]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  useEffect(() => {
    api.get('/picks/weeks').then(r => {
      const eligible = (r.data.weeks || []).filter(w => {
        const isPast = w.deadline && new Date() > new Date(w.deadline);
        return isPast || w.isScored || w.isOpen;
      });
      setWeeks(eligible);
      if (!selectedWeek && eligible.length > 0) {
        // Prefer most recently scored, then open, then last
        const scored = [...eligible].reverse().find(w => w.isScored);
        const open = eligible.find(w => w.isOpen);
        setSelectedWeek(scored?.week || open?.week || eligible[eligible.length - 1]?.week);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;
    setLoading(true); setError('');
    api.get(`/picks/reveal/${selectedWeek}`)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load picks'))
      .finally(() => setLoading(false));
  }, [selectedWeek]);

  const weekLabel = (w) => w === 1 ? 'Week 0/1' : `Week ${w}`;

  if (loading && !data) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING PICKS...</div>
    </div>
  );

  if (!loading && weeks.length === 0) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">PICK REVEAL</h1>
        <div className="page-subtitle">SEE WHAT EVERYONE PICKED · REVEALED AFTER DEADLINE</div>
      </div>
      <div className="score-card">
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>NO WEEKS AVAILABLE YET — CHECK BACK ONCE THE SEASON STARTS</p>
        </div>
      </div>
    </div>
  );

  const { reveal = [], weekConfig, mostPicked = [] } = data || {};
  const isScored = weekConfig?.isScored;

  // Sort: scored = by points desc, unscored = alphabetical
  const sorted = [...reveal].sort((a, b) =>
    isScored ? b.totalPoints - a.totalPoints : a.displayName.localeCompare(b.displayName)
  );

  // Count how many picked each team across all submissions
  const teamPickMap = {};
  for (const s of reveal) {
    for (const p of s.picks) {
      if (!teamPickMap[p.team]) teamPickMap[p.team] = [];
      teamPickMap[p.team].push({ player: s.displayName, pickType: p.pickType, result: p.result });
    }
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leaderboard')}>← STANDINGS</button>
        </div>
        <h1 className="page-title">PICK REVEAL</h1>
        <div className="page-subtitle">SEE WHAT EVERYONE PICKED · REVEALED AFTER DEADLINE</div>
      </div>

      {/* Week selector */}
      {weeks.length > 0 && (
        <div className="week-tabs" style={{ marginBottom: 20 }}>
          {weeks.map(w => (
            <button
              key={w.week}
              className={`week-tab ${selectedWeek === w.week ? 'active' : ''} ${w.isScored ? 'scored' : 'open'}`}
              onClick={() => setSelectedWeek(w.week)}
            >
              {w.week === 1 ? 'WK 0/1' : `WK ${w.week}`}
            </button>
          ))}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {data && (
        <>
          {/* Status banner */}
          <div className="score-card" style={{ marginBottom: 16, padding: '12px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2 }}>
                  {weekLabel(selectedWeek).toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: isScored ? '#4ab870' : 'var(--amber)', letterSpacing: 2, marginTop: 3 }}>
                  {isScored ? '✓ SCORED · RESULTS FINAL' : 'DEADLINE PASSED · AWAITING SCORING'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--amber)' }}>{reveal.length}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>SUBMITTED</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--cream-dim)' }}>
                    {reveal.filter(s => s.wasRandyd).length}
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>RANDY'D</div>
                </div>
              </div>
            </div>
          </div>

          {/* Most picked teams */}
          {mostPicked.length > 0 && (
            <div className="score-card" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2, marginBottom: 12 }}>MOST PICKED</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {mostPicked.map(({ team, total, win, upset }) => (
                  <div key={team} style={{
                    background: 'var(--elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '8px 12px', minWidth: 120,
                  }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14 }}>{team}</div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginTop: 2 }}>
                      {total} PICK{total !== 1 ? 'S' : ''}
                      {win > 0 && <span style={{ color: 'var(--cream-dim)', marginLeft: 4 }}>{win}W</span>}
                      {upset > 0 && <span style={{ color: 'var(--amber)', marginLeft: 4 }}>⚡{upset}U</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Player picks */}
          <div>
            {sorted.map((s, i) => {
              const isMe = s.userId?.toString() === user?._id?.toString();
              const isExpanded = expandedPlayer === s.userId;
              return (
                <div key={s.userId} style={{
                  background: 'var(--card)',
                  border: `1px solid ${isMe ? 'var(--amber-dim)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', marginBottom: 8, overflow: 'hidden',
                }}>
                  {/* Player header row */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                    onClick={() => setExpandedPlayer(isExpanded ? null : s.userId)}
                  >
                    {isScored && (
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--amber)', width: 32, flexShrink: 0, textAlign: 'center' }}>
                        {i + 1}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {s.displayName}
                        {isMe && <span className="badge badge-amber" style={{ fontSize: 9 }}>YOU</span>}
                        {s.wasRandyd && <span className="badge badge-red" style={{ fontSize: 9 }}>RANDY'D</span>}
                      </div>
                      {/* Pick type summary chips */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {s.picks.map((p, pi) => (
                          <span key={pi} style={{
                            fontFamily: 'var(--font-scoreboard)', fontSize: 9, letterSpacing: 0.5,
                            padding: '2px 6px', borderRadius: 3,
                            background: p.pickType === 'upset_loss' ? 'rgba(245,166,35,0.1)' : 'var(--elevated)',
                            border: `1px solid ${p.result === 'correct' ? '#4ab870' : p.result === 'incorrect' ? '#e05c5c' : p.pickType === 'upset_loss' ? 'var(--amber-dim)' : 'var(--border)'}`,
                            color: p.result === 'correct' ? '#4ab870' : p.result === 'incorrect' ? '#e05c5c' : p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--cream-dim)',
                          }}>
                            {p.team}{p.pickType === 'upset_loss' ? ' ⚡' : ''}
                            {p.result === 'correct' ? ' ✓' : p.result === 'incorrect' ? ' ✗' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                      {isScored && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--amber)', lineHeight: 1 }}>{s.totalPoints}</div>
                          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>PTS</div>
                        </div>
                      )}
                      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</div>
                    </div>
                  </div>

                  {/* Expanded picks detail */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--elevated)' }}>
                      {s.picks.map((p, pi) => (
                        <div key={pi} className={`pick-slot ${p.result || 'pending'}`} style={{ marginBottom: 6 }}>
                          <div className="pick-num">{pi + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div className="pick-team-name">{p.team}</div>
                            <div className="pick-type-tag" style={{ color: p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)' }}>
                              {p.pickType === 'win_vs_power4' ? 'WIN VS P4 · 1PT' : '⚡ UPSET LOSS · 2PTS'}
                            </div>
                            {/* Who else picked this team */}
                            {teamPickMap[p.team]?.length > 1 && (
                              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 0.5, marginTop: 2 }}>
                                ALSO PICKED BY: {teamPickMap[p.team].filter(x => x.player !== s.displayName).map(x => x.player).join(', ')}
                              </div>
                            )}
                          </div>
                          {isScored && (
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: p.result === 'correct' ? '#4ab870' : '#e05c5c' }}>
                                {p.pointsEarned}pt
                              </div>
                              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: p.result === 'correct' ? '#4ab870' : '#e05c5c', letterSpacing: 1 }}>
                                {p.result?.toUpperCase()}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {isScored && (
                        <Link to={`/h2h/${s.userId}`} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>
                          HEAD TO HEAD VS {s.displayName.toUpperCase()} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
