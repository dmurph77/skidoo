import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// TAB DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'standings',  label: 'STANDINGS',    icon: '▲' },
  { key: 'historical', label: 'HISTORICAL',   icon: '📊' },
  { key: 'recap',      label: 'WEEKLY RECAP', icon: '◐' },
  { key: 'myteams',    label: 'MY TEAMS',     icon: '⊞' },
  { key: 'matrix',     label: 'PICKS MATRIX', icon: '▦' },
];

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const thStyle = {
  fontFamily: 'var(--font-scoreboard)', fontSize: 11, letterSpacing: 2,
  color: 'var(--green-text)', padding: '8px 6px', borderBottom: '1px solid var(--border)',
  fontWeight: 400, whiteSpace: 'nowrap',
};

// ── Season Line Chart ────────────────────────────────────────────────────────
const CHART_COLORS = ['#f5a623', '#c0c0c0', '#cd7f32', '#6fcf97'];

function StandingsLineChart({ players, myId }) {
  if (!players || players.length === 0) return null;
  const maxWeeks = Math.max(...players.map(p => (p.weeklyPoints || []).length), 0);
  if (maxWeeks === 0) return null;

  const top3 = players.slice(0, 3);
  const me = players.find(p => p.userId?.toString() === myId?.toString());
  const meIsTop3 = top3.some(p => p.userId?.toString() === myId?.toString());
  const featured = meIsTop3 ? top3 : [...top3, ...(me ? [me] : [])];

  const chartData = Array.from({ length: maxWeeks }, (_, i) => {
    const row = { week: i === 0 ? 'Wk 0/1' : `Wk ${i + 1}` };
    featured.forEach(p => {
      row[p.userId] = (p.weeklyPoints || []).slice(0, i + 1).reduce((s, w) => s + (w.points || 0), 0);
    });
    return row;
  });

  const getColor = (p, i) => {
    if (!meIsTop3 && p.userId?.toString() === myId?.toString()) return CHART_COLORS[3];
    return CHART_COLORS[i] || CHART_COLORS[2];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--font-scoreboard)', fontSize: 14, letterSpacing: 1 }}>
        <div style={{ color: 'var(--amber-pencil)', marginBottom: 6 }}>{label.toUpperCase()}</div>
        {[...payload].sort((a, b) => b.value - a.value).map(entry => (
          <div key={entry.dataKey} style={{ color: entry.color, marginBottom: 3, display: 'flex', gap: 10, justifyContent: 'space-between', minWidth: 150 }}>
            <span>{entry.name}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="score-card" style={{ marginBottom: 16, padding: '20px 16px 12px' }}>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 3, marginBottom: 4 }}>
        CUMULATIVE POINTS · TOP 3{!meIsTop3 && me ? ' + YOU' : ''}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,18,16,0.12)" />
          <XAxis dataKey="week" tick={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, fill: 'var(--green-text)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, fill: 'var(--green-text)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {featured.map((p, i) => (
            <Line key={p.userId} type="monotone" dataKey={p.userId} name={p.displayName}
              stroke={getColor(p, i)} strokeWidth={p.userId?.toString() === myId?.toString() ? 2.5 : 2}
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        {featured.map((p, i) => (
          <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 14, height: 3, background: getColor(p, i), borderRadius: 2 }} />
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--cream-dim)', letterSpacing: 1 }}>
              {p.userId?.toString() === myId?.toString()
                ? `${p.displayName.split(' ')[0].toUpperCase()} (YOU)`
                : p.displayName.split(' ')[0].toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compact season standings table — rows clickable to H2H ──────────────────
function SeasonTable({ standings, myId, navigate }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="score-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--elevated)' }}>
            <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>#</th>
            <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 12 }}>PLAYER</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>PTS</th>
            <th style={{ ...thStyle, textAlign: 'right', paddingRight: 14 }}>TEAMS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((p, i) => {
            const isMe = p.userId?.toString() === myId?.toString();
            const canH2H = !isMe && p.userId;
            return (
              <tr key={p.userId}
                onClick={() => canH2H && navigate(`/h2h/${p.userId}`)}
                style={{
                  background: isMe ? 'rgba(245,166,35,0.06)' : 'transparent',
                  borderBottom: '1px solid var(--rule-dark)',
                  cursor: canH2H ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (canH2H) e.currentTarget.style.background = 'rgba(245,166,35,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isMe ? 'rgba(245,166,35,0.06)' : 'transparent'; }}
              >
                <td style={{ textAlign: 'center', fontFamily: i < 3 ? 'inherit' : 'var(--font-display)', fontSize: i < 3 ? 18 : 15, padding: '9px 4px', color: 'var(--text-muted)', width: 40 }}>
                  {i < 3 ? medals[i] : i + 1}
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15 }}>
                    <span style={{ color: isMe ? 'var(--amber-pencil)' : 'var(--text-primary)' }}>{p.displayName}</span>
                    {isMe && <span className="badge badge-amber" style={{ fontSize: 11 }}>YOU</span>}
                    {canH2H && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1 }}>H2H →</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--green-text)', letterSpacing: 1, marginTop: 1 }}>@{p.username}</div>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 22, color: isMe ? 'var(--amber-pencil)' : 'var(--text-primary)', padding: '9px 10px' }}>
                  {p.seasonPoints}
                </td>
                <td style={{ textAlign: 'right', padding: '9px 14px 9px 6px', fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>
                  {p.teamsUsed}/68
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Historical points-by-week table ──────────────────────────────────────────
function HistoricalTable({ standings, weeks, myId }) {
  const scoredWeeks = weeks.filter(w => w.isScored);
  if (scoredWeeks.length === 0) return (
    <div className="score-card"><div className="empty-state"><p>NO SCORED WEEKS YET</p></div></div>
  );
  return (
    <div className="score-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: 'var(--elevated)' }}>
              <th style={{ ...thStyle, position: 'sticky', left: 0, zIndex: 10, background: 'var(--elevated)', width: 130, minWidth: 130, textAlign: 'left', paddingLeft: 12, borderRight: '1px solid var(--border)' }}>PLAYER</th>
              {scoredWeeks.map(w => (
                <th key={w.week} style={{ ...thStyle, width: 52, minWidth: 52, textAlign: 'center' }}>
                  {w.week === 1 ? 'W0/1' : `W${w.week}`}
                </th>
              ))}
              <th style={{ ...thStyle, textAlign: 'right', paddingRight: 12, borderLeft: '1px solid var(--border)', minWidth: 60 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {standings.map(p => {
              const isMe = p.userId?.toString() === myId?.toString();
              const wkMap = {};
              (p.weeklyPoints || []).forEach(wp => { wkMap[wp.week] = { points: wp.points, wasRandyd: wp.wasRandyd }; });
              return (
                <tr key={p.userId} style={{ background: isMe ? 'rgba(245,166,35,0.06)' : 'transparent', borderBottom: '1px solid var(--rule-dark)' }}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: isMe ? 'rgba(245,166,35,0.06)' : 'var(--bg)', padding: '8px 12px', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, borderRight: '1px solid var(--border)', color: isMe ? 'var(--amber-pencil)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {p.displayName}
                  </td>
                  {scoredWeeks.map(w => {
                    const wk = wkMap[w.week];
                    const pts = wk?.points;
                    const randyd = wk?.wasRandyd;
                    return (
                      <td key={w.week} title={randyd ? "Randy'd" : undefined} style={{
                        textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 15, padding: '8px 4px',
                        background: randyd ? 'rgba(200,60,40,0.15)' : 'transparent',
                        color: pts != null ? (pts >= 4 ? 'var(--green-pencil)' : pts >= 2 ? 'var(--amber-pencil)' : 'var(--cream-dim)') : 'var(--text-muted)',
                        position: 'relative',
                      }}>
                        {randyd && <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 9, opacity: 0.75 }}>🎲</span>}
                        {pts != null ? pts : '—'}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, padding: '8px 12px', borderLeft: '1px solid var(--border)', color: isMe ? 'var(--amber-pencil)' : 'var(--text-primary)' }}>
                    {p.seasonPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Weekly Recap Tab ──────────────────────────────────────────────────────────
function WeeklyRecapTab({ scoredWeeks, selectedWeek, setSelectedWeek, loadWeek, weekConfig, weekBoard, weekWinner, recap, user, setDrilldown, navigate, seasonStandings }) {
  return (
    <>
      {scoredWeeks.length > 0 ? (
        <div className="week-tabs" style={{ marginBottom: 18 }}>
          {scoredWeeks.map(w => (
            <button key={w.week} className={`week-tab ${selectedWeek === w.week ? 'active' : ''} ${w.isScored ? 'scored' : ''} ${w.isOpen ? 'open' : ''}`} onClick={() => loadWeek(w.week)}>
              {w.week === 1 ? 'WK 0/1' : `WK ${w.week}`}
            </button>
          ))}
        </div>
      ) : (
        <div className="score-card">
          <div className="empty-state"><span className="empty-icon">📅</span><p>NO WEEKS HAVE BEEN SCORED YET</p></div>
        </div>
      )}

      {weekConfig?.isScored && recap && (
        <div className="score-card gold" style={{ marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 3, color: 'var(--amber-pencil)', marginBottom: 12 }}>
            {weekConfig.week === 1 ? 'WEEK 0/1' : `WEEK ${weekConfig.week}`} RECAP
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {weekWinner && (
              <div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 3 }}>🏆 WEEKLY WINNER</div>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-condensed)' }}>{weekWinner.displayName}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--amber-pencil)' }}>{recap.winnerPoints} PTS</div>
              </div>
            )}
            {recap.biggestUpset && (
              <div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 3 }}>🎯 BIGGEST UPSET HIT</div>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-condensed)' }}>{recap.biggestUpset}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber-pencil)', letterSpacing: 1 }}>CORRECTLY PICKED TO LOSE · 2 PTS</div>
              </div>
            )}
            {recap.randydPlayers?.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 3 }}>🎲 RANDY'D</div>
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--red-score)' }}>
                  {recap.randydPlayers.length} PLAYER{recap.randydPlayers.length > 1 ? 'S' : ''} GOT RANDY'D
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {weekBoard.length > 0 && selectedWeek && (
        <div>
          {weekBoard.map((p, i) => {
            const isMe = p.userId?.toString() === user?._id?.toString();
            const canH2H = !isMe && p.userId;
            return (
              <div key={p.userId}
                className={`board-row ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''} ${isMe ? 'is-me' : ''}`}
                onClick={() => {
                  if (weekConfig?.isScored) setDrilldown(p);
                  else if (canH2H) navigate(`/h2h/${p.userId}`);
                }}
                style={{ cursor: 'pointer' }}>
                <div className={`board-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-condensed)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {p.displayName}
                    {isMe && <span className="badge badge-amber" style={{ fontSize: 13 }}>YOU</span>}
                    {p.wasRandyd && <span className="badge badge-red" style={{ fontSize: 13 }}>RANDY'D</span>}
                    {weekConfig?.isScored && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)' }}>→ VIEW PICKS</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>@{p.username}</div>
                </div>
                <div className="board-points">{p.weekPoints}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Picks modal ───────────────────────────────────────────────────────────────
function PlayerPicksModal({ player, weekConfig, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div className="modal-title">{player.displayName.toUpperCase()}</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 2 }}>
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
                <div className="pick-type-tag">{p.pickType === 'win_vs_power4' ? 'WIN VS P4' : 'UPSET LOSS'} · {p.pickType === 'win_vs_power4' ? '1PT' : '2PTS'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: p.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-score)' }}>{p.pointsEarned}pt</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: p.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-score)', letterSpacing: 1 }}>{p.result?.toUpperCase()}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state"><p>PICKS WILL BE VISIBLE AFTER THIS WEEK IS SCORED</p></div>
        )}
        {weekConfig?.isScored && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--elevated)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--amber-pencil)' }}>{player.weekPoints}</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2 }}>POINTS THIS WEEK</div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// EXPLORE / TEAM COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// SHARED UTILS
// ─────────────────────────────────────────────────────────────────────────────
function pct(prob) { return prob == null ? null : Math.round(prob * 100); }
function probColor(prob) {
  if (prob == null) return 'var(--green-text)';
  if (prob >= 0.70) return 'var(--green-pencil)';
  if (prob >= 0.50) return 'var(--cream-dim)';
  if (prob >= 0.35) return 'var(--amber)';
  return 'var(--red-pencil)';
}

// ─────────────────────────────────────────────────────────────────────────────
// THIS WEEK (PickReveal)
// ─────────────────────────────────────────────────────────────────────────────
function ThisWeek({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  useEffect(() => {
    api.get('/picks/weeks').then(r => {
      const eligible = (r.data.weeks || []).filter(w => {
        const isPast = w.deadline && new Date() > new Date(w.deadline);
        return isPast || w.isScored || w.isOpen;
      });
      setWeeks(eligible);
      if (eligible.length > 0) {
        const scored = [...eligible].reverse().find(w => w.isScored);
        const open = eligible.find(w => w.isOpen);
        setSelectedWeek(scored?.week || open?.week || eligible[eligible.length - 1]?.week);
      } else {
        setLoading(false);
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

  if (weeks.length === 0 && !loading) return (
    <div className="score-card"><div className="empty-state"><span className="empty-icon">📋</span><p>NO WEEKS AVAILABLE YET</p></div></div>
  );

  const { reveal = [], weekConfig, mostPicked = [] } = data || {};
  const isScored = weekConfig?.isScored;
  const weekLabel = (w) => w === 1 ? 'Week 0/1' : `Week ${w}`;
  const sorted = [...reveal].sort((a, b) => isScored ? b.totalPoints - a.totalPoints : a.displayName.localeCompare(b.displayName));
  const teamPickMap = {};
  for (const s of reveal) for (const p of s.picks) {
    if (!teamPickMap[p.team]) teamPickMap[p.team] = [];
    teamPickMap[p.team].push({ player: s.displayName, pickType: p.pickType, result: p.result });
  }

  return (
    <div>
      {weeks.length > 0 && (
        <div className="week-tabs" style={{ marginBottom: 20 }}>
          {weeks.map(w => (
            <button key={w.week} className={`week-tab ${selectedWeek === w.week ? 'active' : ''} ${w.isScored ? 'scored' : 'open'}`}
              onClick={() => { setSelectedWeek(w.week); setExpandedPlayer(null); }}>
              {w.week === 1 ? 'WK 0/1' : `WK ${w.week}`}
            </button>
          ))}
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && !data && <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>LOADING PICKS...</div>}
      {data && (
        <>
          <div className="score-card" style={{ marginBottom: 16, padding: '12px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2 }}>{weekLabel(selectedWeek).toUpperCase()}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: isScored ? 'var(--green-pencil)' : 'var(--amber-pencil)', letterSpacing: 2, marginTop: 3 }}>
                  {isScored ? '✓ SCORED · RESULTS FINAL' : 'DEADLINE PASSED · AWAITING SCORING'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--amber-pencil)' }}>{reveal.length}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>SUBMITTED</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-secondary)' }}>{reveal.filter(s => s.wasRandyd).length}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>RANDY'D</div>
                </div>
              </div>
            </div>
          </div>
          {mostPicked.length > 0 && (
            <div className="score-card" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2, marginBottom: 12 }}>MOST PICKED</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {mostPicked.map(({ team, total, win, upset }) => (
                  <div key={team} style={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', minWidth: 120 }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14 }}>{team}</div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1, marginTop: 2 }}>
                      {total} PICK{total !== 1 ? 'S' : ''}
                      {win > 0 && <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{win}W</span>}
                      {upset > 0 && <span style={{ color: 'var(--amber-pencil)', marginLeft: 4 }}>⚡{upset}U</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sorted.map((s, i) => {
            const isMe = s.userId?.toString() === user?._id?.toString();
            const isExpanded = expandedPlayer === s.userId;
            return (
              <div key={s.userId} style={{ background: 'var(--card)', border: `1px solid ${isMe ? 'var(--amber-dim)' : 'var(--border)'}`, borderRadius: 'var(--radius)', marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }} onClick={() => setExpandedPlayer(isExpanded ? null : s.userId)}>
                  {isScored && <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--amber-pencil)', width: 32, flexShrink: 0, textAlign: 'center' }}>{i + 1}</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {s.displayName}
                      {isMe && <span className="badge badge-amber" style={{ fontSize: 13 }}>YOU</span>}
                      {s.wasRandyd && <span className="badge badge-red" style={{ fontSize: 13 }}>RANDY'D</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {s.picks.map((p, pi) => (
                        <span key={pi} style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, letterSpacing: 0.5, padding: '2px 6px', borderRadius: 3,
                          background: p.pickType === 'upset_loss' ? 'rgba(160,64,0,0.07)' : 'var(--elevated)',
                          border: `1px solid ${p.result === 'correct' ? 'var(--green-pencil)' : p.result === 'incorrect' ? 'var(--red-pencil)' : p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--rule-dark)'}`,
                          color: p.result === 'correct' ? 'var(--green-pencil)' : p.result === 'incorrect' ? 'var(--red-pencil)' : p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--text-secondary)',
                        }}>{p.team}{p.pickType === 'upset_loss' ? ' ⚡' : ''}{p.result === 'correct' ? ' ✓' : p.result === 'incorrect' ? ' ✗' : ''}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                    {isScored && <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--amber-pencil)', lineHeight: 1 }}>{s.totalPoints}</div><div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>PTS</div></div>}
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</div>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--elevated)' }}>
                    {s.picks.map((p, pi) => (
                      <div key={pi} className={`pick-slot ${p.result || 'pending'}`} style={{ marginBottom: 6 }}>
                        <div className="pick-num">{pi + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div className="pick-team-name">{p.team}{p.opponent ? <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', fontWeight: 400, marginLeft: 6 }}>vs {p.opponent}</span> : ''}</div>
                          <div className="pick-type-tag" style={{ color: p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)' }}>
                            {p.pickType === 'win_vs_power4' ? 'WIN · 1PT' : '⚡ UPSET LOSS · 2PTS'}
                          </div>
                          {teamPickMap[p.team]?.length > 1 && (
                            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 0.5, marginTop: 2 }}>
                              ALSO PICKED BY: {teamPickMap[p.team].filter(x => x.player !== s.displayName).map(x => x.player).join(', ')}
                            </div>
                          )}
                        </div>
                        {isScored && (
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: p.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-pencil)' }}>{p.pointsEarned}pt</div>
                            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: p.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-pencil)', letterSpacing: 1 }}>{p.result?.toUpperCase()}</div>
                          </div>
                        )}
                      </div>
                    ))}
                    {isScored && <Link to={`/h2h/${s.userId}`} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>HEAD TO HEAD VS {s.displayName.toUpperCase()} →</Link>}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CONFERENCE DATA
// ─────────────────────────────────────────────────────────────────────────────
const CONFERENCES = {
  'SEC': ['Alabama','Arkansas','Auburn','Florida','Georgia','Kentucky','LSU','Mississippi State','Missouri','Ole Miss','South Carolina','Tennessee','Texas A&M','Vanderbilt','Texas','Oklahoma'],
  'Big Ten': ['Illinois','Indiana','Iowa','Maryland','Michigan','Michigan State','Minnesota','Nebraska','Northwestern','Ohio State','Penn State','Purdue','Rutgers','Wisconsin','UCLA','USC','Oregon','Washington'],
  'Big 12': ['Arizona','Arizona State','Baylor','BYU','Cincinnati','Colorado','Houston','Iowa State','Kansas','Kansas State','Oklahoma State','TCU','Texas Tech','UCF','Utah','West Virginia'],
  'ACC': ['Boston College','California','Clemson','Duke','Florida State','Georgia Tech','Louisville','Miami','NC State','North Carolina','Pittsburgh','SMU','Stanford','Syracuse','Virginia','Virginia Tech','Wake Forest'],
  'Ind': ['Notre Dame'],
};

// ─────────────────────────────────────────────────────────────────────────────
// TEAM SCHEDULE POPUP (inline schedule preview on My Teams click)
// ─────────────────────────────────────────────────────────────────────────────
function TeamSchedulePopup({ team, onClose, onViewFull, anchorRect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/picks/team/${encodeURIComponent(team)}/schedule`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [team]);

  const popupStyle = {
    position: 'fixed', zIndex: 400, background: 'var(--card)',
    border: '1px solid var(--amber-dim)', borderRadius: 'var(--radius)',
    padding: '14px 16px', width: 300,
    boxShadow: '0 6px 20px rgba(20,18,16,0.18)',
  };
  if (anchorRect) {
    const spaceRight = window.innerWidth - anchorRect.right;
    if (spaceRight >= 320) {
      popupStyle.top = Math.min(anchorRect.top, window.innerHeight - 420);
      popupStyle.left = anchorRect.right + 8;
    } else {
      popupStyle.top = Math.min(anchorRect.bottom + 6, window.innerHeight - 420);
      popupStyle.left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 316));
    }
  } else {
    popupStyle.top = '20%'; popupStyle.left = '50%'; popupStyle.transform = 'translateX(-50%)';
  }

  const now = new Date();
  const schedule = data?.schedule || [];
  const upcoming = schedule.filter(g => !g.teamScore && (!g.gameDate || new Date(g.gameDate) >= now)).slice(0, 4);
  const past = schedule.filter(g => g.teamScore != null || (g.gameDate && new Date(g.gameDate) < now)).slice(-3).reverse();
  const wins = schedule.filter(g => g.won === true).length;
  const losses = schedule.filter(g => g.won === false).length;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 399 }} />
      <div style={popupStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2 }}>{team.toUpperCase()}</div>
            {data && <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginTop: 3 }}>
              {data.conference} · {wins}W–{losses}L · {data.usedByMe
                ? <span style={{ color: 'var(--red-pencil)' }}>USED BY YOU</span>
                : <span style={{ color: 'var(--green-pencil)' }}>AVAILABLE</span>}
            </div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--green-text)', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        {loading && <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, padding: '12px 0' }}>LOADING...</div>}

        {!loading && data && (
          <>
            {upcoming.length > 0 && (
              <>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber-pencil)', letterSpacing: 2, marginBottom: 6 }}>UPCOMING</div>
                {upcoming.map(g => {
                  const isUpset = g.matchupType !== 'p4_vs_p4';
                  return (
                    <div key={g.week} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--rule)' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13 }}>{g.isHome ? 'vs' : '@'} {g.opponent}</div>
                        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: isUpset ? 'var(--amber)' : 'var(--green-text)', letterSpacing: 1, marginTop: 1 }}>
                          {g.weekLabel.toUpperCase()} · {isUpset ? '⚡ UPSET ELIGIBLE' : 'P4 VS P4'}
                        </div>
                      </div>
                      {g.winProb != null && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: probColor(g.winProb), letterSpacing: 1 }}>{pct(g.winProb)}%</div>
                          <div style={{ width: 40, height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 2 }}>
                            <div style={{ height: 3, width: `${pct(g.winProb)}%`, background: probColor(g.winProb), borderRadius: 2 }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            {past.length > 0 && (
              <>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginTop: 10, marginBottom: 6 }}>RECENT RESULTS</div>
                {past.map(g => (
                  <div key={g.week} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15 }}>{g.isHome ? 'vs' : '@'} {g.opponent}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {g.teamScore != null && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--text-secondary)' }}>{g.teamScore}–{g.oppScore}</span>}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: g.won === true ? 'var(--green-pencil)' : g.won === false ? 'var(--red-pencil)' : 'var(--amber-pencil)' }}>
                        {g.won === true ? 'W' : g.won === false ? 'L' : 'T'}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
            {schedule.length === 0 && <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>NO SCHEDULE DATA YET</div>}
          </>
        )}

        <button onClick={onViewFull} className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: '100%', borderColor: 'var(--border)' }}>
          FULL SCHEDULE + STATS →
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MY TEAMS (availability grid — click card for popup, popup links to Explorer)
// ─────────────────────────────────────────────────────────────────────────────
function MyTeams({ user, onViewTeam }) {
  const [filter, setFilter] = useState('all');
  const [popup, setPopup] = useState(null); // { team, rect }
  const usedSet = new Set(user?.usedTeams || []);
  const total = 68, used = usedSet.size, remaining = total - used;

  const handleTeamClick = (team, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (popup?.team === team) { setPopup(null); return; }
    setPopup({ team, rect });
  };

  return (
    <div>
      {popup && (
        <TeamSchedulePopup
          team={popup.team}
          anchorRect={popup.rect}
          onClose={() => setPopup(null)}
          onViewFull={() => { setPopup(null); onViewTeam(popup.team); }}
        />
      )}

      <div className="stat-strip" style={{ marginBottom: 16 }}>
        <div className="stat-cell"><div className="stat-number" style={{ color: 'var(--green-pencil)' }}>{remaining}</div><div className="stat-label">AVAILABLE</div></div>
        <div className="stat-cell"><div className="stat-number dim">{used}</div><div className="stat-label">USED</div></div>
        <div className="stat-cell"><div className="stat-number">{total}</div><div className="stat-label">TOTAL</div></div>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, marginBottom: 20 }}>
        <div style={{ height: 8, borderRadius: 4, width: `${(used / total) * 100}%`, background: used > 50 ? 'var(--red-pencil)' : used > 30 ? 'var(--amber-pencil)' : 'var(--amber-pencil)', transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[{ key: 'all', label: 'ALL TEAMS' }, { key: 'available', label: `AVAILABLE (${remaining})` }, { key: 'used', label: `USED (${used})` }].map(({ key, label }) => (
          <button key={key} className={`btn btn-sm ${filter === key ? 'btn-outline' : 'btn-ghost'}`}
            style={{ borderColor: filter === key ? 'var(--amber)' : undefined, color: filter === key ? 'var(--amber)' : undefined }}
            onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1, marginBottom: 16 }}>
        CLICK ANY TEAM TO SEE SCHEDULE · "FULL SCHEDULE" FOR DETAIL VIEW
      </div>
      {Object.entries(CONFERENCES).map(([conf, teams]) => {
        const filtered = teams.filter(t => filter === 'available' ? !usedSet.has(t) : filter === 'used' ? usedSet.has(t) : true);
        if (filtered.length === 0) return null;
        const confUsed = teams.filter(t => usedSet.has(t)).length;
        return (
          <div key={conf} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 3, color: 'var(--amber-pencil)' }}>{conf}</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>{teams.length - confUsed}/{teams.length} LEFT</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
              {filtered.map(team => {
                const isUsed = usedSet.has(team);
                const isOpen = popup?.team === team;
                return (
                  <div key={team} onClick={e => handleTeamClick(team, e)}
                    style={{ padding: '10px 12px', background: isOpen ? 'rgba(160,64,0,0.08)' : '#ffffff', border: `1.5px solid ${isOpen ? 'var(--amber-pencil)' : isUsed ? 'var(--ink-ghost)' : 'var(--ink-light)'}`, borderRadius: 'var(--radius)', opacity: isUsed && !isOpen ? 0.55 : 1, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(20,18,16,0.08)' }}>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontWeight: 700, fontSize: 13, color: isOpen ? 'var(--amber-pencil)' : isUsed ? 'var(--ink-faint)' : 'var(--ink)', letterSpacing: 0.3 }}>{team}</div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: isUsed ? 'var(--red-pencil)' : 'var(--green-pencil)', letterSpacing: 1, marginTop: 2 }}>{isUsed ? 'USED' : 'AVAILABLE'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MY PICK HISTORY
// ─────────────────────────────────────────────────────────────────────────────
function MyPickHistory({ user }) {
  const [history, setHistory] = useState([]);
  const [availableTeams, setAvailableTeams] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/picks/my-history'), api.get('/picks/available-teams')])
      .then(([h, t]) => {
        setHistory(h.data.history || []);
        setAvailableTeams(t.data);
        if (h.data.history?.length > 0) setSelectedWeek(h.data.history[h.data.history.length - 1].week);
      }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>LOADING...</div>;
  const totalPoints = history.reduce((s, w) => s + (w.totalPoints || 0), 0);
  const scored = history.filter(w => w.isScored);
  const bestWeek = scored.length ? scored.reduce((b, w) => w.totalPoints > b.totalPoints ? w : b) : null;
  const selectedData = history.find(h => h.week === selectedWeek);

  if (history.length === 0) return (
    <div className="score-card"><div className="empty-state"><span className="empty-icon">📋</span><p>NO PICKS SUBMITTED YET</p><Link to="/picks" className="btn btn-primary" style={{ marginTop: 16 }}>SUBMIT FIRST PICKS →</Link></div></div>
  );

  return (
    <div>
      <div className="stat-strip" style={{ marginBottom: 16 }}>
        <div className="stat-cell"><div className="stat-number dim">{totalPoints}</div><div className="stat-label">SEASON PTS</div></div>
        <div className="stat-cell"><div className="stat-number cream">{history.length}</div><div className="stat-label">WEEKS FILED</div></div>
        <div className="stat-cell"><div className="stat-number green">{bestWeek?.totalPoints || 0}</div><div className="stat-label">BEST WEEK{bestWeek ? ` (W${bestWeek.week === 1 ? '0/1' : bestWeek.week})` : ''}</div></div>
        <div className="stat-cell"><div className="stat-number red">{availableTeams?.usedCount || 0}</div><div className="stat-label">TEAMS USED</div></div>
      </div>
      <div className="week-tabs" style={{ marginBottom: 16 }}>
        {history.map(w => (
          <button key={w.week} className={`week-tab ${selectedWeek === w.week ? 'active' : ''} ${w.isScored ? 'scored' : ''}`} onClick={() => setSelectedWeek(w.week)}>
            WK {w.week === 1 ? '0/1' : w.week}
            {w.isScored && <span style={{ display: 'block', fontSize: 13, marginTop: 1 }}>{w.totalPoints}PT</span>}
          </button>
        ))}
      </div>
      {selectedData && (
        <div className="score-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2 }}>WEEK {selectedData.week === 1 ? '0/1' : selectedData.week} PICKS</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 1, marginTop: 3 }}>
                FILED: {new Date(selectedData.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}
                {selectedData.wasRandyd && <span className="badge badge-red" style={{ marginLeft: 8 }}>RANDY'D</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {selectedData.isScored && <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--amber-pencil)', lineHeight: 1 }}>{selectedData.totalPoints}<span style={{ fontSize: 14, color: 'var(--green-text)' }}>PTS</span></div>}
              {!selectedData.isLocked && <Link to={`/picks/${selectedData.week}`} className="btn btn-ghost btn-sm">EDIT</Link>}
            </div>
          </div>
          {selectedData.picks.map((pick, i) => (
            <div key={i} className={`pick-slot ${pick.result || 'pending'}`}>
              <div className="pick-num">{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div className="pick-team-name">{pick.team}{pick.opponent ? <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', fontWeight: 400, marginLeft: 6 }}>vs {pick.opponent}</span> : ''}</div>
                <div className="pick-type-tag">{pick.pickType === 'win_vs_power4' ? 'WIN · 1PT' : 'UPSET LOSS · 2PTS'}</div>
              </div>
              {selectedData.isScored ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: pick.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-pencil)' }}>{pick.pointsEarned}pt</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: pick.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-pencil)', letterSpacing: 1 }}>{pick.result?.toUpperCase()}</div>
                </div>
              ) : <span className="badge badge-gray">PENDING</span>}
            </div>
          ))}
          {selectedData.commissionerAdjustments?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {selectedData.commissionerAdjustments.map((adj, i) => (
                <div key={i} className="pick-slot" style={{ borderColor: 'rgba(245,166,35,0.3)', background: 'rgba(245,166,35,0.04)' }}>
                  <div className="pick-num" style={{ color: 'var(--amber-pencil)' }}>⚑</div>
                  <div style={{ flex: 1 }}><div className="pick-team-name" style={{ color: 'var(--amber-pencil)', fontSize: 13 }}>COMMISSIONER ADJUSTMENT</div><div className="pick-type-tag">{adj.reason || 'Manual adjustment'}</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: adj.delta >= 0 ? 'var(--green-pencil)' : 'var(--red-pencil)' }}>{adj.delta >= 0 ? '+' : ''}{adj.delta}pt</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {availableTeams && (
        <div className="score-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2 }}>TEAMS USED THIS SEASON</div>
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 1 }}>{availableTeams.usedCount}/68</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {availableTeams.usedTeams.map(t => <span key={t} className="badge badge-gray">{t}</span>)}
            {availableTeams.usedCount === 0 && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--green-text)' }}>NONE YET</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM EXPLORER — schedule drill-down
// ─────────────────────────────────────────────────────────────────────────────
function GameHoverCard({ game }) {
  const isUpset = game.matchupType !== 'p4_vs_p4';
  return (
    <div style={{
      position: 'absolute', zIndex: 200, background: 'var(--card)',
      border: `1px solid ${isUpset ? 'var(--amber-dim)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)', padding: '12px 14px', minWidth: 230,
      boxShadow: '0 8px 32px rgba(0,0,0,0.55)', pointerEvents: 'none',
      top: '100%', left: 0, marginTop: 6,
    }}>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 6 }}>
        {game.gameDate ? new Date(game.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase() : 'DATE TBD'}
      </div>
      <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
        {game.isHome ? 'vs' : '@'} {game.opponent}
      </div>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, letterSpacing: 1, marginBottom: 8, color: isUpset ? 'var(--amber)' : 'var(--green-text)' }}>
        {isUpset ? '⚡ UPSET ELIGIBLE · 2PT IF THEY LOSE' : 'P4 VS P4 · 1PT WIN'}
      </div>
      {game.winProb != null && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: probColor(game.winProb), letterSpacing: 1 }}>WIN PROB {pct(game.winProb)}%</span>
            {isUpset && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber-pencil)', letterSpacing: 1 }}>UPSET {pct(1 - game.winProb)}%</span>}
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: 4, width: `${pct(game.winProb)}%`, background: probColor(game.winProb), borderRadius: 2 }} />
          </div>
        </div>
      )}
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, letterSpacing: 1,
        color: game.alreadyUsed ? 'var(--red-pencil)' : game.pickedThisWeek ? 'var(--amber-pencil)' : 'var(--green-pencil)' }}>
        {game.alreadyUsed ? '✗ TEAM ALREADY USED THIS SEASON' : game.pickedThisWeek ? `✓ YOU PICKED: ${game.pickedThisWeek === 'upset_loss' ? '⚡ UPSET' : 'WIN'}` : '✓ AVAILABLE TO PICK'}
      </div>
    </div>
  );
}

function TeamDetail({ team, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredWeek, setHoveredWeek] = useState(null);

  useEffect(() => {
    setLoading(true); setData(null); setError('');
    api.get(`/picks/team/${encodeURIComponent(team)}/schedule`)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load team data'))
      .finally(() => setLoading(false));
  }, [team]);

  if (loading) return <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>LOADING {team.toUpperCase()}...</div>;
  if (error) return <><div className="alert alert-error">{error}</div><button className="btn btn-ghost btn-sm" onClick={onBack}>← BACK</button></>;
  if (!data) return null;

  const { schedule, leagueByWeek, conference, usedByMe } = data;
  const now = new Date();
  const past = schedule.filter(g => g.teamScore != null || (g.gameDate && new Date(g.gameDate) < now));
  const upcoming = schedule.filter(g => g.teamScore == null && (!g.gameDate || new Date(g.gameDate) >= now));
  const wins = past.filter(g => g.won === true).length;
  const losses = past.filter(g => g.won === false).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginTop: 4, flexShrink: 0 }}>← BACK</button>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: 3, margin: 0, lineHeight: 1.1 }}>{team.toUpperCase()}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2 }}>{conference}</span>
            <span className={`badge ${usedByMe ? 'badge-red' : 'badge-green'}`}>{usedByMe ? 'USED BY YOU' : 'AVAILABLE TO PICK'}</span>
          </div>
        </div>
      </div>

      <div className="stat-strip" style={{ marginBottom: 20 }}>
        <div className="stat-cell"><div className="stat-number" style={{ color: 'var(--green-pencil)' }}>{wins}</div><div className="stat-label">WINS</div></div>
        <div className="stat-cell"><div className="stat-number" style={{ color: 'var(--red-pencil)' }}>{losses}</div><div className="stat-label">LOSSES</div></div>
        <div className="stat-cell"><div className="stat-number">{schedule.length}</div><div className="stat-label">GAMES</div></div>
        <div className="stat-cell">
          <div className="stat-number" style={{ color: 'var(--amber-pencil)' }}>{Object.values(leagueByWeek).flat().length}</div>
          <div className="stat-label">LEAGUE PICKS</div>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber-pencil)', letterSpacing: 3, marginBottom: 12 }}>UPCOMING GAMES</div>
          {upcoming.map(g => {
            const isUpset = g.matchupType !== 'p4_vs_p4';
            const leaguePicks = leagueByWeek[g.week] || [];
            return (
              <div key={g.week}
                style={{ position: 'relative', background: 'var(--card)', border: `1px solid ${isUpset ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`, borderLeft: isUpset ? '3px solid var(--amber-dim)' : undefined, borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 8 }}
                onMouseEnter={() => setHoveredWeek(g.week)}
                onMouseLeave={() => setHoveredWeek(null)}
              >
                {hoveredWeek === g.week && <GameHoverCard game={g} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 4 }}>
                      {g.weekLabel.toUpperCase()} · {g.gameDate ? new Date(g.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase() : 'TBD'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16 }}>
                      {g.isHome ? 'vs' : '@'} {g.opponent}
                    </div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: isUpset ? 'var(--amber)' : 'var(--green-text)', letterSpacing: 1, marginTop: 3 }}>
                      {isUpset ? '⚡ UPSET ELIGIBLE' : 'P4 VS P4'}
                      {g.winProb != null && <span style={{ marginLeft: 8, color: probColor(g.winProb) }}>WIN PROB {pct(g.winProb)}%</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    {leaguePicks.length > 0 && <>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--amber-pencil)' }}>{leaguePicks.length}</div>
                      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--green-text)', letterSpacing: 1 }}>PICKED</div>
                    </>}
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, letterSpacing: 1, marginTop: 4,
                      color: g.alreadyUsed ? 'var(--red-pencil)' : g.pickedThisWeek ? 'var(--amber-pencil)' : 'var(--green-pencil)' }}>
                      {g.alreadyUsed ? 'USED' : g.pickedThisWeek ? 'YOU PICKED' : 'AVAILABLE'}
                    </div>
                  </div>
                </div>
                {g.winProb != null && (
                  <div style={{ marginTop: 10, height: 3, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{ height: 3, width: `${pct(g.winProb)}%`, background: probColor(g.winProb), borderRadius: 2 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Past results */}
      {past.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 3, marginBottom: 12 }}>PAST RESULTS</div>
          {[...past].reverse().map(g => {
            const leaguePicks = leagueByWeek[g.week] || [];
            const anyCorrect = leaguePicks.some(p => p.result === 'correct');
            const allIncorrect = leaguePicks.length > 0 && leaguePicks.every(p => p.result === 'incorrect');
            return (
              <div key={g.week} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 6 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: g.won === true ? 'var(--green-pencil)' : g.won === false ? 'var(--red-pencil)' : 'var(--amber-pencil)', width: 28, flexShrink: 0, textAlign: 'center' }}>
                  {g.won === true ? 'W' : g.won === false ? 'L' : 'T'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14 }}>{g.isHome ? 'vs' : '@'} {g.opponent}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1, marginTop: 2 }}>
                    {g.weekLabel.toUpperCase()}
                    {g.teamScore != null && <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>{g.teamScore}–{g.oppScore}</span>}
                  </div>
                </div>
                {leaguePicks.length > 0 && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: anyCorrect ? 'var(--green-pencil)' : allIncorrect ? 'var(--red-pencil)' : 'var(--text-muted)' }}>{leaguePicks.length}</div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--green-text)', letterSpacing: 1 }}>PICKED</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {schedule.length === 0 && (
        <div className="score-card"><div className="empty-state"><span className="empty-icon">🏈</span><p>NO GAMES IN DB FOR {team.toUpperCase()} YET</p></div></div>
      )}
    </div>
  );
}

function TeamExplorer({ user, initialTeam }) {
  const [selectedTeam, setSelectedTeam] = useState(initialTeam || null);
  const [search, setSearch] = useState('');
  const allTeams = Object.values(CONFERENCES).flat();
  const filtered = search ? allTeams.filter(t => t.toLowerCase().includes(search.toLowerCase())) : null;

  // If a team is preselected (cross-tab navigation from MyTeams), jump straight to detail
  useEffect(() => { if (initialTeam) setSelectedTeam(initialTeam); }, [initialTeam]);

  if (selectedTeam) return <TeamDetail team={selectedTeam} onBack={() => { setSelectedTeam(null); setSearch(''); }} user={user} />;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <input className="form-input" placeholder="SEARCH ANY TEAM..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ fontFamily: 'var(--font-scoreboard)', letterSpacing: 1 }} />
        {search && filtered.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {filtered.map(team => (
              <button key={team} className="btn btn-sm btn-ghost" onClick={() => { setSelectedTeam(team); setSearch(''); }}
                style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700 }}>{team}</button>
            ))}
          </div>
        )}
        {search && filtered.length === 0 && (
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 1, marginTop: 8 }}>NO TEAMS MATCH "{search.toUpperCase()}"</div>
        )}
      </div>
      {!search && (
        <>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 3, marginBottom: 16 }}>SELECT A TEAM TO VIEW SCHEDULE + PICK CONTEXT</div>
          {Object.entries(CONFERENCES).map(([conf, teams]) => (
            <div key={conf} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 3, color: 'var(--amber-pencil)', marginBottom: 10 }}>{conf}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                {teams.map(team => (
                  <button key={team} onClick={() => setSelectedTeam(team)}
                    style={{ textAlign: 'left', fontFamily: 'var(--font-scoreboard)', fontWeight: 700, fontSize: 13, padding: '10px 12px', background: '#ffffff', border: '1.5px solid var(--ink-light)', borderRadius: 'var(--radius)', color: 'var(--ink)', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(20,18,16,0.08)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    {team}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PICKS MATRIX
// ─────────────────────────────────────────────────────────────────────────────
function cellState(entries, isScored) {
  if (!entries || entries.length === 0) return 'empty';
  if (!isScored) return 'pending';
  const hasUpset = entries.some(e => e.result === 'correct' && e.pickType === 'upset_loss');
  const hasWin   = entries.some(e => e.result === 'correct');
  const allWrong = entries.every(e => e.result === 'incorrect');
  if (hasUpset) return 'upset';
  if (hasWin)   return 'win';
  if (allWrong) return 'wrong';
  return 'mixed';
}

const CELL_COLORS = { empty: 'transparent', pending: 'rgba(245,166,35,0.15)', win: 'rgba(74,184,112,0.3)', upset: 'rgba(26,92,53,0.75)', wrong: 'rgba(224,92,92,0.25)', mixed: 'rgba(74,184,112,0.15)' };
const CELL_BORDER = { empty: 'var(--rule)', pending: 'rgba(160,64,0,0.35)', win: 'rgba(26,107,58,0.4)', upset: 'rgba(26,107,58,0.6)', wrong: 'rgba(192,57,43,0.4)', mixed: 'rgba(26,107,58,0.25)' };

function MatrixTooltip({ entries, label, isScored, x, y }) {
  if (!entries || entries.length === 0) return null;
  const safeX = Math.min(x, window.innerWidth - 260);
  const safeY = Math.min(y, window.innerHeight - 40 - entries.length * 26);
  return (
    <div style={{ position: 'fixed', zIndex: 300, background: 'var(--card)', border: '1px solid var(--amber-dim)', borderRadius: 'var(--radius)', padding: '10px 14px', minWidth: 210, boxShadow: '0 4px 16px rgba(20,18,16,0.18)', pointerEvents: 'none', left: safeX, top: safeY }}>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber-pencil)', letterSpacing: 2, marginBottom: 8 }}>{label}</div>
      {entries.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, color: e.result === 'correct' ? 'var(--green-pencil)' : e.result === 'incorrect' ? 'var(--red-pencil)' : 'var(--text-primary)' }}>
            {e.displayName || e.team}
          </span>
          <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, letterSpacing: 1, color: e.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)', marginLeft: 10 }}>
            {e.pickType === 'upset_loss' ? '⚡' : ''}
            {isScored && e.result ? ` ${e.result === 'correct' ? `+${e.pointsEarned ?? '?'}pt` : '0pt'}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function PicksMatrix({ user, onViewTeam }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('teams');
  const [showAll, setShowAll] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const navigate = useNavigate();
  // sort: { col: 'week_N' | 'correct' | 'incorrect' | 'points' | 'upsets' | null, dir: 'asc'|'desc'|null }
  const [sort, setSort] = useState({ col: 'players', dir: 'desc' }); // teams default: most players; switches on view toggle

  const cycleSort = (col) => {
    setSort(prev => {
      if (prev.col !== col) return { col, dir: 'desc' };
      if (prev.dir === 'desc') return { col, dir: 'asc' };
      return { col: null, dir: null };
    });
  };

  const sortIcon = (col) => {
    if (sort.col !== col) return ' ↕';
    if (sort.dir === 'desc') return ' ↓';
    return ' ↑';
  };

  useEffect(() => {
    api.get('/picks/matrix').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>LOADING MATRIX...</div>;
  if (!data) return null;

  const { weeks, teamRows, playerRows, myId } = data;
  // Build a lookup: weekWinners[week] = Set of winnerUserIds
  const weekWinners = {};
  for (const w of weeks) {
    if (w.winnerIds?.length) weekWinners[w.week] = new Set(w.winnerIds);
  }
  const FREEZE_W = 122;
  const CELL_W = 46;
  const CELL_H = 34;
  const STAT_W = 64;

  // Enrich team rows: unique players + avg pts per scored pick
  const enrichedTeamRows = teamRows.map(row => {
    const allEntries = Object.values(row.byWeek).flat();
    const uniquePlayers = new Set(allEntries.map(e => e.displayName)).size;
    const scored = allEntries.filter(e => e.result != null && e.pointsEarned != null);
    const avgScore = scored.length > 0 ? (scored.reduce((s, e) => s + (e.pointsEarned || 0), 0) / scored.length).toFixed(2) : '—';
    return { ...row, uniquePlayers, avgScore };
  });

  // Enrich player rows: upsets + correct/incorrect + totalPts
  const enrichedPlayerRows = playerRows.map(row => {
    const allPicks = Object.values(row.byWeek).flatMap(wd => wd.picks || []);
    const upsets = allPicks.filter(p => p.pickType === 'upset_loss').length;
    const correct = allPicks.filter(p => p.result === 'correct').length;
    const incorrect = allPicks.filter(p => p.result === 'incorrect').length;
    const totalPts = Object.values(row.byWeek).reduce((s, wd) => s + (wd?.totalPoints || 0), 0);
    return { ...row, upsets, correct, incorrect, totalPts };
  });

  // Avg score per week for footer row
  const weekAvgs = weeks.map(w => {
    const scores = playerRows
      .map(row => row.byWeek[w.week])
      .filter(wd => wd?.isScored && wd?.totalPoints != null)
      .map(wd => wd.totalPoints);
    return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
  });

  const showTip = (e, entries, label, isScored) => {
    if (!entries || entries.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ entries, label, isScored, x: rect.left + rect.width / 2, y: rect.bottom + 6 });
  };

  const renderTeamsView = () => {
    // Apply sort
    let sorted = [...enrichedTeamRows];
    if (sort.col && sort.dir) {
      sorted.sort((a, b) => {
        let av, bv;
        if (sort.col.startsWith('week_')) {
          const wk = parseInt(sort.col.split('_')[1]);
          av = (a.byWeek[wk] || []).length;
          bv = (b.byWeek[wk] || []).length;
        } else if (sort.col === 'players') {
          av = a.uniquePlayers; bv = b.uniquePlayers;
        } else if (sort.col === 'avgpts') {
          av = parseFloat(a.avgScore) || 0; bv = parseFloat(b.avgScore) || 0;
        }
        return sort.dir === 'desc' ? bv - av : av - bv;
      });
    }
    const rows = showAll ? sorted : sorted.slice(0, 20);

    const thSort = (col, label, extraStyle = {}) => {
      const active = sort.col === col;
      return (
        <th onClick={() => cycleSort(col)} style={{ cursor: 'pointer', userSelect: 'none',
          fontFamily: 'var(--font-scoreboard)', fontSize: 11, letterSpacing: 0,
          color: active ? 'var(--amber)' : 'var(--green-text)',
          borderBottom: '1px solid var(--border)', textAlign: 'center', padding: '4px 2px', whiteSpace: 'pre-wrap', lineHeight: 1.2,
          ...extraStyle }}>
          {label}{sortIcon(col)}
        </th>
      );
    };

    return (
      <div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 10 }}>
          TEAMS × WEEKS · CLICK COLUMN HEADER TO SORT · CLICK TEAM NAME FOR SCHEDULE
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {[{ c: CELL_COLORS.win, b: CELL_BORDER.win, l: 'CORRECT WIN' }, { c: CELL_COLORS.upset, b: CELL_BORDER.upset, l: 'CORRECT UPSET' }, { c: CELL_COLORS.wrong, b: CELL_BORDER.wrong, l: 'INCORRECT' }, { c: CELL_COLORS.pending, b: CELL_BORDER.pending, l: 'PENDING' }].map(({ c, b, l }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 12, background: c, border: `1px solid ${b}`, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--green-text)', letterSpacing: 1 }}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: FREEZE_W + weeks.length * CELL_W + STAT_W * 2 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--bg)', width: FREEZE_W, minWidth: FREEZE_W, padding: '6px 10px', textAlign: 'left', fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>TEAM</th>
                {weeks.map(w => thSort(`week_${w.week}`, w.label, {
                  width: CELL_W, minWidth: CELL_W,
                  color: sort.col === `week_${w.week}` ? 'var(--amber)' : w.isScored ? 'var(--green-pencil)' : w.isOpen ? 'var(--amber-pencil)' : 'var(--text-muted)',
                }))}
                {thSort('players', 'PLAYERS', { width: STAT_W, minWidth: STAT_W, padding: '4px 6px', borderLeft: '1px solid var(--border)', color: sort.col === 'players' ? 'var(--amber)' : 'var(--amber)', fontSize: 11, whiteSpace: 'nowrap' })}
                {thSort('avgpts', 'AVG PTS', { width: STAT_W, minWidth: STAT_W, padding: '4px 6px', color: sort.col === 'avgpts' ? 'var(--amber)' : 'var(--amber)', fontSize: 11, whiteSpace: 'nowrap' })}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.team}>
                  <td
                    onClick={() => onViewTeam(row.team)}
                    title={`View ${row.team} schedule`}
                    style={{ position: 'sticky', left: 0, zIndex: 5, background: 'var(--bg)', padding: '4px 10px', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: FREEZE_W, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--rule-dark)', cursor: 'pointer', color: 'var(--amber-pencil)', textDecoration: 'underline', textDecorationColor: 'rgba(160,64,0,0.4)' }}
                  >{row.team}</td>
                  {weeks.map(w => {
                    const entries = row.byWeek[w.week] || [];
                    const state = cellState(entries, w.isScored);
                    const isActiveSortCol = sort.col === `week_${w.week}`;
                    // High-contrast text colors per state
                    const numColor = state === 'wrong' ? '#e05c5c' : state === 'pending' ? '#f0a500' : state === 'upset' ? '#ffffff' : state === 'win' ? '#1a5c35' : 'var(--text-muted)';
                    return (
                      <td key={w.week}
                        onMouseEnter={e => showTip(e, entries, `${row.team} · ${w.label}`, w.isScored)}
                        onMouseLeave={() => setTooltip(null)}
                        style={{ width: CELL_W, height: CELL_H, textAlign: 'center', verticalAlign: 'middle', background: isActiveSortCol ? 'rgba(245,166,35,0.05)' : CELL_COLORS[state], border: `1px solid ${isActiveSortCol ? 'rgba(245,166,35,0.2)' : CELL_BORDER[state]}`, cursor: entries.length > 0 ? 'pointer' : 'default' }}>
                        {entries.length > 0 && <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: numColor }}>{entries.length}</span>}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--amber-pencil)', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--rule-dark)', background: sort.col === 'players' ? 'rgba(245,166,35,0.05)' : undefined }}>{row.uniquePlayers}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--rule-dark)', background: sort.col === 'avgpts' ? 'rgba(245,166,35,0.05)' : undefined }}>{row.avgScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {enrichedTeamRows.length > 20 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(s => !s)} style={{ marginTop: 12, width: '100%', borderColor: 'var(--border)' }}>
            {showAll ? 'SHOW LESS ▲' : `SHOW ALL ${enrichedTeamRows.length} TEAMS ▼`}
          </button>
        )}
      </div>
    );
  };

  const renderPlayersView = () => {
    // Apply sort to players
    let sortedPlayers = [...enrichedPlayerRows];
    if (sort.col && sort.dir) {
      sortedPlayers.sort((a, b) => {
        let av, bv;
        if (sort.col.startsWith('week_')) {
          const wk = parseInt(sort.col.split('_')[1]);
          av = a.byWeek[wk]?.totalPoints ?? -1;
          bv = b.byWeek[wk]?.totalPoints ?? -1;
        } else if (sort.col === 'correct')   { av = a.correct;   bv = b.correct; }
        else if (sort.col === 'incorrect')   { av = a.incorrect; bv = b.incorrect; }
        else if (sort.col === 'points')      { av = a.totalPts;  bv = b.totalPts; }
        else if (sort.col === 'upsets')      { av = a.upsets;    bv = b.upsets; }
        else return 0;
        return sort.dir === 'desc' ? bv - av : av - bv;
      });
    }

    const STAT_W2 = 52;
    const thSortP = (col, label, extraStyle = {}) => {
      const active = sort.col === col;
      return (
        <th onClick={() => cycleSort(col)} style={{ cursor: 'pointer', userSelect: 'none',
          fontFamily: 'var(--font-scoreboard)', fontSize: 11, letterSpacing: 0,
          color: active ? 'var(--amber)' : 'var(--green-text)',
          borderBottom: '1px solid var(--border)', textAlign: 'center', padding: '6px 3px', whiteSpace: 'nowrap',
          background: active ? 'rgba(245,166,35,0.06)' : undefined,
          ...extraStyle }}>
          {label}{sortIcon(col)}
        </th>
      );
    };

    return (
      <div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 14 }}>
          PLAYERS × WEEKS · CLICK HEADER TO SORT · HOVER CELL FOR PICKS
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: FREEZE_W + weeks.length * CELL_W + STAT_W2 * 4 + 12 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--bg)', width: FREEZE_W, minWidth: FREEZE_W, padding: '6px 10px', textAlign: 'left', fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>PLAYER</th>
                {weeks.map(w => (
                  <th key={w.week} onClick={() => cycleSort(`week_${w.week}`)}
                    style={{ width: CELL_W, minWidth: CELL_W, padding: '6px 2px', textAlign: 'center',
                      cursor: 'pointer', userSelect: 'none',
                      fontFamily: 'var(--font-scoreboard)', fontSize: 11, letterSpacing: 0,
                      color: sort.col === `week_${w.week}` ? 'var(--amber)' : w.isScored ? 'var(--green-text)' : w.isOpen ? 'var(--amber-pencil)' : 'var(--text-muted)',
                      borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                      background: sort.col === `week_${w.week}` ? 'rgba(245,166,35,0.06)' : undefined }}>
                    {w.week === 1 ? 'W0/1' : `W${w.week}`}{sortIcon(`week_${w.week}`)}
                  </th>
                ))}
                {thSortP('correct',   '✓',     { width: STAT_W2, minWidth: STAT_W2, borderLeft: '1px solid var(--border)' })}
                {thSortP('incorrect', '✗',     { width: STAT_W2, minWidth: STAT_W2 })}
                {thSortP('points',    'PTS',   { width: STAT_W2, minWidth: STAT_W2 })}
                {thSortP('upsets',    '⚡UPS', { width: STAT_W2 + 14, minWidth: STAT_W2 + 14 })}
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map(row => {
                const isMe = row.userId === myId?.toString();
                return (
                  <tr key={row.userId}>
                    <td
                      onClick={() => navigate(`/h2h/${row.userId}`)}
                      title={`Head-to-head vs ${row.displayName}`}
                      style={{ position: 'sticky', left: 0, zIndex: 5, background: 'var(--bg)', padding: '4px 10px', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: FREEZE_W, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--rule-dark)', color: isMe ? 'var(--amber-pencil)' : 'var(--text-primary)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(20,18,16,0.3)' }}>
                      {row.displayName}{isMe ? ' ◂' : ''}
                    </td>
                    {weeks.map(w => {
                      const wd = row.byWeek[w.week];
                      const picks = wd?.picks || [];
                      const tipEntries = picks.map(p => ({ displayName: p.opponent ? `${p.team} vs ${p.opponent}` : p.team, pickType: p.pickType, result: p.result, pointsEarned: p.pointsEarned }));
                      const isActiveSortCol = sort.col === `week_${w.week}`;
                      const hasTrophy = weekWinners[w.week]?.has(row.userId);
                      const isRandyd = wd?.wasRandyd;
                      return (
                        <td key={w.week}
                          onMouseEnter={e => showTip(e, tipEntries, `${row.displayName} · ${w.label}`, w.isScored)}
                          onMouseLeave={() => setTooltip(null)}
                          style={{ width: CELL_W, height: CELL_H, textAlign: 'center', verticalAlign: 'middle',
                            background: isActiveSortCol ? 'rgba(245,166,35,0.05)' : 'transparent',
                            border: `1px solid ${isActiveSortCol ? 'rgba(245,166,35,0.2)' : 'var(--rule-dark)'}`,
                            cursor: wd ? 'pointer' : 'default', position: 'relative' }}>
                          {wd && <>
                            {hasTrophy && <div style={{ fontSize: 11, lineHeight: 1 }}>🏆</div>}
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: hasTrophy || isRandyd ? 12 : 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {w.isScored ? wd.totalPoints : '·'}
                            </span>
                            {isRandyd && <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--red-pencil)', lineHeight: 1, marginTop: 1 }}>R</div>}
                          </>}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--rule-dark)', background: sort.col === 'correct' ? 'rgba(245,166,35,0.05)' : undefined }}>{row.correct || '—'}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--rule-dark)', background: sort.col === 'incorrect' ? 'rgba(245,166,35,0.05)' : undefined }}>{row.incorrect || '—'}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: isMe ? 'var(--amber-pencil)' : 'var(--text-primary)', borderBottom: '1px solid var(--rule-dark)', background: sort.col === 'points' ? 'rgba(245,166,35,0.05)' : undefined }}>{row.totalPts || '—'}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--rule-dark)', background: sort.col === 'upsets' ? 'rgba(245,166,35,0.05)' : undefined }}>
                      {row.upsets > 0 ? `⚡${row.upsets}` : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'var(--elevated)', padding: '6px 10px', fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, borderRight: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                  AVG / WK
                </td>
                {weeks.map((w, i) => (
                  <td key={w.week} style={{ background: sort.col === `week_${w.week}` ? 'rgba(245,166,35,0.06)' : 'var(--elevated)', textAlign: 'center', verticalAlign: 'middle', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: weekAvgs[i] != null ? 'var(--text-primary)' : 'var(--text-muted)', borderTop: '1px solid var(--border)', height: CELL_H }}>
                    {weekAvgs[i] ?? '—'}
                  </td>
                ))}
                <td colSpan={4} style={{ background: 'var(--elevated)', borderLeft: '1px solid var(--border)', borderTop: '1px solid var(--border)' }} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ key: 'teams', label: '▦ TEAMS VIEW' }, { key: 'players', label: '▤ PLAYERS VIEW' }].map(({ key, label }) => (
          <button key={key} className={`btn btn-sm ${viewMode === key ? 'btn-outline' : 'btn-ghost'}`}
            style={{ borderColor: viewMode === key ? 'var(--amber)' : undefined, color: viewMode === key ? 'var(--amber)' : undefined }}
            onClick={() => {
              setViewMode(key);
              // Apply sensible default sort for each view
              if (key === 'players') setSort({ col: 'points', dir: 'desc' });
              if (key === 'teams')   setSort({ col: 'players', dir: 'desc' });
            }}>{label}</button>
        ))}
      </div>
      {viewMode === 'teams' ? renderTeamsView() : renderPlayersView()}
      {tooltip && <MatrixTooltip {...tooltip} />}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED STANDINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Standings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = TABS.find(t => t.key === searchParams.get('tab'))?.key || 'standings';
  const [activeTab,   setActiveTab]   = useState(initial);
  const [histView,    setHistView]    = useState('chart');

  // Leaderboard data (lazy-loaded once standings tabs are visited)
  const [lbData,      setLbData]      = useState(null);
  const [lbLoading,   setLbLoading]   = useState(false);
  const [weeks,       setWeeks]       = useState([]);
  const [selectedWk,  setSelectedWk]  = useState(null);
  const [weeklyData,  setWeeklyData]  = useState(null);
  const [drilldown,   setDrilldown]   = useState(null);

  const switchTab = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  const lbTabs = ['standings', 'historical', 'recap'];
  useEffect(() => {
    if (!lbTabs.includes(activeTab) || lbData) return;
    setLbLoading(true);
    Promise.all([api.get('/picks/leaderboard'), api.get('/picks/weeks')])
      .then(([bRes, wRes]) => {
        setLbData(bRes.data);
        const ws = wRes.data.weeks || [];
        setWeeks(ws);
        const cur = bRes.data.currentWeek;
        setSelectedWk(cur);
        if (cur) setWeeklyData({ board: bRes.data.weeklyBoard, weekConfig: ws.find(w => w.week === cur) });
      }).catch(console.error).finally(() => setLbLoading(false));
  }, [activeTab, lbData]);

  const loadWeek = async (week) => {
    setSelectedWk(week);
    try {
      const r = await api.get(`/picks/leaderboard/week/${week}`);
      setWeeklyData({ board: r.data.board, weekConfig: r.data.weekConfig });
    } catch (e) { console.error(e); }
  };

  const seasonStandings = lbData?.seasonStandings || [];
  const scoredWeeks     = weeks.filter(w => w.isScored || w.isOpen);
  const weekConfig      = weeklyData?.weekConfig;
  const weekBoard       = weeklyData?.board || [];
  const recap           = weekConfig?.recap;
  const weekWinner      = recap?.winnerId
    ? weekBoard.find(p => p.userId?.toString() === recap.winnerId?.toString()) : null;

  const LbLoading = () => (
    <div className="score-card"><div className="empty-state"><p style={{ fontFamily: 'var(--font-scoreboard)', letterSpacing: 2 }}>LOADING...</p></div></div>
  );

  return (
    <div>
      {drilldown && <PlayerPicksModal player={drilldown} weekConfig={weekConfig} onClose={() => setDrilldown(null)} />}

      <div className="page-header" style={{ paddingBottom: 0 }}>
        <h1 className="page-title">STANDINGS</h1>
        <div className="page-subtitle">2026 SEASON · STATS & LEAGUE DATA</div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, marginTop: 16, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => switchTab(tab.key)} style={{
            flexShrink: 0, padding: '10px 12px', border: 'none', cursor: 'pointer', background: 'transparent',
            borderBottom: `2px solid ${activeTab === tab.key ? 'var(--amber)' : 'transparent'}`,
            color: activeTab === tab.key ? 'var(--amber)' : 'var(--green-text)',
            fontFamily: 'var(--font-scoreboard)', fontSize: 13, letterSpacing: 1.5,
            transition: 'color 0.15s, border-color 0.15s', whiteSpace: 'nowrap',
          }}>
            <span style={{ marginRight: 4 }}>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* ── STANDINGS ── */}
      {activeTab === 'standings' && (
        lbLoading ? <LbLoading /> :
        seasonStandings.length === 0
          ? <div className="score-card"><div className="empty-state"><span className="empty-icon">🏆</span><p>SEASON STANDINGS WILL APPEAR AFTER WEEK 1 IS SCORED</p></div></div>
          : <SeasonTable standings={seasonStandings} myId={user?._id} navigate={navigate} />
      )}

      {/* ── HISTORICAL ── */}
      {activeTab === 'historical' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[{ key: 'chart', label: '📈 LINE CHART' }, { key: 'table', label: '▦ POINTS TABLE' }].map(t => (
              <button key={t.key}
                className={`btn btn-sm ${histView === t.key ? 'btn-outline' : 'btn-ghost'}`}
                style={{ borderColor: histView === t.key ? 'var(--amber)' : undefined, color: histView === t.key ? 'var(--amber)' : undefined }}
                onClick={() => setHistView(t.key)}>{t.label}
              </button>
            ))}
          </div>
          {lbLoading ? <LbLoading /> :
            seasonStandings.length === 0
              ? <div className="score-card"><div className="empty-state"><span className="empty-icon">📊</span><p>NO HISTORY YET</p></div></div>
              : histView === 'chart'
                ? <StandingsLineChart players={seasonStandings} myId={user?._id} />
                : <HistoricalTable standings={seasonStandings} weeks={weeks} myId={user?._id} />
          }
        </>
      )}

      {/* ── WEEKLY RECAP ── */}
      {activeTab === 'recap' && (
        lbLoading ? <LbLoading /> :
        <WeeklyRecapTab
          scoredWeeks={scoredWeeks} selectedWeek={selectedWk}
          setSelectedWeek={setSelectedWk} loadWeek={loadWeek}
          weekConfig={weekConfig} weekBoard={weekBoard}
          weekWinner={weekWinner} recap={recap}
          user={user} setDrilldown={setDrilldown}
          navigate={navigate} seasonStandings={seasonStandings}
        />
      )}

      {/* ── MY TEAMS ── */}
      {activeTab === 'myteams' && <MyTeams user={user} onViewTeam={() => {}} />}

      {/* ── PICKS MATRIX ── */}
      {activeTab === 'matrix' && <PicksMatrix user={user} onViewTeam={() => {}} />}
    </div>
  );
}
