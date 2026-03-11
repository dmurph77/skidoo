import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const thStyle = {
  fontFamily: 'var(--font-scoreboard)', fontSize: 11, letterSpacing: 2,
  color: 'var(--green-text)', padding: '8px 6px', borderBottom: '1px solid var(--border)',
  fontWeight: 400, whiteSpace: 'nowrap',
};

// ── Season Line Chart (top 3 + current user only) ──────────────────────────
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
              stroke={getColor(p, i)}
              strokeWidth={p.userId?.toString() === myId?.toString() ? 2.5 : 2}
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

// ── Compact season standings table ──────────────────────────────────────────
function SeasonTable({ standings, myId }) {
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
            return (
              <tr key={p.userId} style={{ background: isMe ? 'rgba(245,166,35,0.06)' : 'transparent', borderBottom: '1px solid var(--rule-dark)' }}>
                <td style={{ textAlign: 'center', fontFamily: i < 3 ? 'inherit' : 'var(--font-display)', fontSize: i < 3 ? 18 : 15, padding: '9px 4px', color: 'var(--text-muted)', width: 40 }}>
                  {i < 3 ? medals[i] : i + 1}
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15 }}>
                    <span style={{ color: isMe ? 'var(--amber-pencil)' : 'var(--text-primary)' }}>{p.displayName}</span>
                    {isMe && <span className="badge badge-amber" style={{ fontSize: 11 }}>YOU</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--green-text)', letterSpacing: 1, marginTop: 1 }}>@{p.username}</div>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 22, color: isMe ? 'var(--amber-pencil)' : 'var(--text-primary)', padding: '9px 10px' }}>
                  {p.seasonPoints}
                </td>
                <td style={{ textAlign: 'right', padding: '9px 14px 9px 6px' }}>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>{p.teamsUsed}/68</div>
                  {p.userId?.toString() !== myId?.toString() && (
                    <Link to={`/h2h/${p.userId}`} style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--amber-pencil)', letterSpacing: 0.5 }}>H2H →</Link>
                  )}
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
              (p.weeklyPoints || []).forEach(wp => { wkMap[wp.week] = wp.points; });
              return (
                <tr key={p.userId} style={{ background: isMe ? 'rgba(245,166,35,0.06)' : 'transparent', borderBottom: '1px solid var(--rule-dark)' }}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: isMe ? 'rgba(245,166,35,0.06)' : 'var(--bg)', padding: '8px 12px', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, borderRight: '1px solid var(--border)', color: isMe ? 'var(--amber-pencil)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {p.displayName}
                  </td>
                  {scoredWeeks.map(w => {
                    const pts = wkMap[w.week];
                    return (
                      <td key={w.week} style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 15, padding: '8px 4px',
                        color: pts != null ? (pts >= 4 ? 'var(--green-pencil)' : pts >= 2 ? 'var(--amber-pencil)' : 'var(--cream-dim)') : 'var(--text-muted)' }}>
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

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('current');
  const [histView, setHistView] = useState('chart');
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [drilldown, setDrilldown] = useState(null);
  const [weeks, setWeeks] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/picks/leaderboard'), api.get('/picks/weeks')])
      .then(([boardRes, weeksRes]) => {
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
  const recap = weekConfig?.recap;
  const weekWinner = recap?.winnerId ? weekBoard.find(p => p.userId?.toString() === recap.winnerId?.toString()) : null;

  return (
    <div>
      {drilldown && <PlayerPicksModal player={drilldown} weekConfig={weekConfig} onClose={() => setDrilldown(null)} />}

      <div className="page-header">
        <h1 className="page-title">STANDINGS</h1>
        <div className="page-subtitle">2026 SEASON · UPDATED AFTER EACH WEEK IS SCORED</div>
      </div>

      {/* ── MAIN TABS ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {[{ key: 'current', label: 'CURRENT STANDINGS' }, { key: 'historical', label: 'HISTORICAL' }].map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)} style={{
            padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
            borderBottom: `2px solid ${mainTab === t.key ? 'var(--amber)' : 'transparent'}`,
            color: mainTab === t.key ? 'var(--amber)' : 'var(--green-text)',
            fontFamily: 'var(--font-scoreboard)', fontSize: 13, letterSpacing: 1.5, whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── CURRENT STANDINGS ── */}
      {mainTab === 'current' && (
        <>
          {seasonStandings.length === 0 ? (
            <div className="score-card" style={{ marginBottom: 24 }}>
              <div className="empty-state"><span className="empty-icon">🏆</span><p>SEASON STANDINGS WILL APPEAR AFTER WEEK 1 IS SCORED</p></div>
            </div>
          ) : (
            <>
              <StandingsLineChart players={seasonStandings} myId={user?._id} />
              <SeasonTable standings={seasonStandings} myId={user?._id} />
            </>
          )}

          <hr className="divider" />

          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 3, color: 'var(--text-primary)', marginBottom: 12 }}>
            WEEKLY RESULTS
          </div>

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
              {weekBoard.map((p, i) => (
                <div key={p.userId}
                  className={`board-row ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''} ${p.userId === user?._id ? 'is-me' : ''}`}
                  onClick={() => weekConfig?.isScored && setDrilldown(p)}
                  style={{ cursor: weekConfig?.isScored ? 'pointer' : 'default' }}>
                  <div className={`board-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-condensed)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {p.displayName}
                      {p.userId === user?._id && <span className="badge badge-amber" style={{ fontSize: 13 }}>YOU</span>}
                      {p.wasRandyd && <span className="badge badge-red" style={{ fontSize: 13 }}>RANDY'D</span>}
                      {weekConfig?.isScored && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)' }}>→ VIEW PICKS</span>}
                    </div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>@{p.username}</div>
                  </div>
                  <div className="board-points">{p.weekPoints}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── HISTORICAL TAB ── */}
      {mainTab === 'historical' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[{ key: 'chart', label: '📈 LINE CHART' }, { key: 'table', label: '▦ POINTS TABLE' }].map(t => (
              <button key={t.key}
                className={`btn btn-sm ${histView === t.key ? 'btn-outline' : 'btn-ghost'}`}
                style={{ borderColor: histView === t.key ? 'var(--amber)' : undefined, color: histView === t.key ? 'var(--amber)' : undefined }}
                onClick={() => setHistView(t.key)}>{t.label}</button>
            ))}
          </div>

          {seasonStandings.length === 0 ? (
            <div className="score-card">
              <div className="empty-state"><span className="empty-icon">📊</span><p>NO HISTORY YET — CHECK BACK AFTER WEEK 1 IS SCORED</p></div>
            </div>
          ) : histView === 'chart' ? (
            <StandingsLineChart players={seasonStandings} myId={user?._id} />
          ) : (
            <HistoricalTable standings={seasonStandings} weeks={weeks} myId={user?._id} />
          )}
        </>
      )}
    </div>
  );
}
