import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

function Sparkline({ weeklyPoints, width = 80, height = 28 }) {
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
  const lastPt = pts[pts.length - 1];
  const prevPt = pts[pts.length - 2];
  const trendColor = lastPt >= prevPt ? '#4ab870' : '#e05c5c';
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={trendColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
      <circle cx={pts.length > 1 ? (pts.length - 1) * step : 0} cy={height - ((lastPt - min) / range) * height} r="2.5" fill={trendColor} />
    </svg>
  );
}


function PlayerPicksModal({ player, weekConfig, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div className="modal-title">{player.displayName.toUpperCase()}</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2 }}>
              WEEK {weekConfig?.week === 1 ? '0/1' : weekConfig?.week} PICKS
              {player.wasRandyd && <span className="badge badge-red" style={{ marginLeft: 8 }}>RANDY'D</span>}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {weekConfig?.isScored ? (
          player.picks.map((p, i) => (
            <div key={i} className={`pick-slot ${p.result || 'pending'}`} style={{ marginBottom: 6 }}>
              <div className="pick-num">{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div className="pick-team-name">{p.team}</div>
                <div className="pick-type-tag">
                  {p.pickType === 'win_vs_power4' ? 'WIN VS P4' : 'UPSET LOSS'} · {p.pickType === 'win_vs_power4' ? '1PT' : '2PTS'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: p.result === 'correct' ? '#4ab870' : 'var(--red-score)' }}>
                  {p.pointsEarned}pt
                </div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: p.result === 'correct' ? '#4ab870' : 'var(--red-score)', letterSpacing: 1 }}>
                  {p.result?.toUpperCase()}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>PICKS WILL BE VISIBLE AFTER THIS WEEK IS SCORED</p>
          </div>
        )}
        {weekConfig?.isScored && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--elevated)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--amber)' }}>{player.weekPoints}</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 2 }}>POINTS THIS WEEK</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [drilldown, setDrilldown] = useState(null);
  const [weeks, setWeeks] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/picks/leaderboard'),
      api.get('/picks/weeks'),
    ]).then(([boardRes, weeksRes]) => {
      setData(boardRes.data);
      const ws = weeksRes.data.weeks || [];
      setWeeks(ws);
      const current = boardRes.data.currentWeek;
      setSelectedWeek(current);
      if (current) setWeeklyData({ board: boardRes.data.weeklyBoard, weekConfig: ws.find(w => w.week === current) });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadWeek = async (week) => {
    setSelectedWeek(week);
    try {
      const res = await api.get(`/picks/leaderboard/week/${week}`);
      setWeeklyData({ board: res.data.board, weekConfig: res.data.weekConfig });
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING...</div>
    </div>
  );

  const { seasonStandings = [] } = data || {};
  const scoredWeeks = weeks.filter(w => w.isScored || w.isOpen);
  const weekConfig = weeklyData?.weekConfig;
  const weekBoard = weeklyData?.board || [];

  // Weekly recap
  const recap = weekConfig?.recap;
  const weekWinner = recap?.winnerId
    ? weekBoard.find(p => p.userId?.toString() === recap.winnerId?.toString())
    : null;

  return (
    <div>
      {drilldown && (
        <PlayerPicksModal
          player={drilldown}
          weekConfig={weekConfig}
          onClose={() => setDrilldown(null)}
        />
      )}

      <div className="page-header">
        <h1 className="page-title">STANDINGS</h1>
        <div className="page-subtitle">2026 SEASON · UPDATED AFTER EACH WEEK IS SCORED</div>
      </div>

      {/* ── SEASON STANDINGS ── */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3, color: 'var(--cream)', marginBottom: 12 }}>
        SEASON STANDINGS
      </div>

      {seasonStandings.length === 0 ? (
        <div className="score-card" style={{ marginBottom: 24 }}>
          <div className="empty-state">
            <span className="empty-icon">🏆</span>
            <p>SEASON STANDINGS WILL APPEAR AFTER WEEK 1 IS SCORED</p>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 28 }}>
          {/* Podium top 3 */}
          {seasonStandings.length >= 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[1, 0, 2].map((idx) => {
                const p = seasonStandings[idx];
                const medals = ['🥇','🥈','🥉'];
                const colors = ['var(--amber)', '#c0c0c0', 'var(--leather)'];
                return (
                  <div key={idx} className="score-card" style={{
                    textAlign: 'center', padding: '16px 12px',
                    borderColor: idx === 0 ? 'var(--amber-dim)' : 'var(--border)',
                    marginTop: idx === 1 ? 0 : 16,
                  }}>
                    <div style={{ fontSize: idx === 0 ? 32 : 24 }}>{medals[idx]}</div>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16, marginTop: 8, letterSpacing: 0.5 }}>
                      {p.displayName}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: idx === 0 ? 42 : 32, color: colors[idx], lineHeight: 1, marginTop: 6 }}>
                      {p.seasonPoints}
                    </div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginTop: 2 }}>POINTS</div>
                    {p.userId === user?._id && <span className="badge badge-amber" style={{ marginTop: 6, display: 'inline-block' }}>YOU</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Full table */}
          {seasonStandings.map((p, i) => (
            <div
              key={p.userId}
              className={`board-row ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''} ${p.userId === user?._id ? 'is-me' : ''}`}
              style={{ cursor: 'default' }}
            >
              <div className={`board-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-condensed)', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {p.displayName}
                  {p.userId === user?._id && <span className="badge badge-amber" style={{ fontSize: 9 }}>YOU</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1, marginTop: 2 }}>
                  @{p.username} · {p.teamsUsed}/68 TEAMS
                </div>
                {p.weeklyPoints?.length >= 2 && (
                  <div style={{ marginTop: 4 }}>
                    <Sparkline weeklyPoints={p.weeklyPoints} width={90} height={22} />
                  </div>
                )}
              </div>
              <div className="board-points">{p.seasonPoints}</div>
            </div>
          ))}
        </div>
      )}

      <hr className="divider" />

      {/* ── WEEKLY RESULTS ── */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3, color: 'var(--cream)', marginBottom: 12 }}>
        WEEKLY RESULTS
      </div>

      {/* Week selector */}
      {scoredWeeks.length > 0 ? (
        <div className="week-tabs" style={{ marginBottom: 18 }}>
          {scoredWeeks.map(w => (
            <button
              key={w.week}
              className={`week-tab ${selectedWeek === w.week ? 'active' : ''} ${w.isScored ? 'scored' : ''} ${w.isOpen ? 'open' : ''}`}
              onClick={() => loadWeek(w.week)}
            >
              {w.week === 1 ? 'WK 0/1' : `WK ${w.week}`}
            </button>
          ))}
        </div>
      ) : (
        <div className="score-card">
          <div className="empty-state">
            <span className="empty-icon">📅</span>
            <p>NO WEEKS HAVE BEEN SCORED YET</p>
          </div>
        </div>
      )}

      {/* Weekly recap */}
      {weekConfig?.isScored && recap && (
        <div className="score-card gold" style={{ marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 3, color: 'var(--amber)', marginBottom: 12 }}>
            {weekConfig.week === 1 ? 'WEEK 0/1' : `WEEK ${weekConfig.week}`} RECAP
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {weekWinner && (
              <div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 3 }}>🏆 WEEKLY WINNER</div>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-condensed)' }}>{weekWinner.displayName}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--amber)' }}>{recap.winnerPoints} PTS</div>
              </div>
            )}
            {recap.biggestUpset && (
              <div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 3 }}>🎯 BIGGEST UPSET HIT</div>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-condensed)' }}>{recap.biggestUpset}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--amber)', letterSpacing: 1 }}>CORRECTLY PICKED TO LOSE · 2 PTS</div>
              </div>
            )}
            {recap.randydPlayers?.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 3 }}>🎲 RANDY'D</div>
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--red-score)' }}>
                  {recap.randydPlayers.length} PLAYER{recap.randydPlayers.length > 1 ? 'S' : ''} GOT RANDY'D
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly board */}
      {weekBoard.length > 0 && selectedWeek && (
        <div>
          {weekBoard.map((p, i) => (
            <div
              key={p.userId}
              className={`board-row ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''} ${p.userId === user?._id ? 'is-me' : ''}`}
              onClick={() => weekConfig?.isScored && setDrilldown(p)}
              style={{ cursor: weekConfig?.isScored ? 'pointer' : 'default' }}
            >
              <div className={`board-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-condensed)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {p.displayName}
                  {p.userId === user?._id && <span className="badge badge-amber" style={{ fontSize: 9 }}>YOU</span>}
                  {p.wasRandyd && <span className="badge badge-red" style={{ fontSize: 9 }}>RANDY'D</span>}
                  {weekConfig?.isScored && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)' }}>→ VIEW PICKS</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1 }}>@{p.username}</div>
              </div>
              <div className="board-points">{p.weekPoints}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
