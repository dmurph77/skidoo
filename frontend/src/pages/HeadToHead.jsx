import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Cell colors matching the Picks Matrix ──────────────────────────────────
const CELL_COLORS = {
  empty:   'transparent',
  pending: 'rgba(245,166,35,0.15)',
  win:     'rgba(74,184,112,0.3)',
  upset:   'rgba(26,92,53,0.75)',
  wrong:   'rgba(224,92,92,0.25)',
};
const CELL_BORDER = {
  empty:   'var(--rule)',
  pending: 'rgba(160,64,0,0.35)',
  win:     'rgba(26,107,58,0.4)',
  upset:   'rgba(26,107,58,0.6)',
  wrong:   'rgba(192,57,43,0.4)',
};

function pickCellState(pick) {
  if (!pick) return 'empty';
  if (!pick.result) return pick.pickType ? 'pending' : 'empty';
  if (pick.result === 'correct' && pick.pickType === 'upset_loss') return 'upset';
  if (pick.result === 'correct') return 'win';
  if (pick.result === 'incorrect') return 'wrong';
  return 'pending';
}

// ── Player Picks Matrix (teams × weeks) ────────────────────────────────────
function PlayerPicksMatrix({ userId, displayName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch full history for this player via the matrix endpoint, filtered to this player
    api.get('/picks/matrix').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>LOADING MATRIX...</div>;
  if (!data) return null;

  const { weeks, playerRows } = data;
  const playerRow = playerRows.find(r => r.userId?.toString() === userId?.toString());
  if (!playerRow) return (
    <div className="score-card"><div className="empty-state"><p>NO PICKS DATA FOR THIS PLAYER YET</p></div></div>
  );

  // Collect all teams this player picked, grouped by team name
  const teamPickMap = {}; // teamName → { week → pick }
  const scoredWeeks = weeks.filter(w => w.isScored);

  for (const w of scoredWeeks) {
    const wd = playerRow.byWeek[w.week];
    if (!wd?.picks) continue;
    for (const pick of wd.picks) {
      if (!teamPickMap[pick.team]) teamPickMap[pick.team] = {};
      teamPickMap[pick.team][w.week] = pick;
    }
  }

  // Sort teams alphabetically
  const teams = Object.keys(teamPickMap).sort();

  if (teams.length === 0) return (
    <div className="score-card"><div className="empty-state"><p>NO SCORED PICKS YET</p></div></div>
  );

  const TEAM_COL_W = 130;
  const CELL_W = 52;
  const CELL_H = 36;

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { c: CELL_COLORS.win,     b: CELL_BORDER.win,     l: 'CORRECT WIN' },
          { c: CELL_COLORS.upset,   b: CELL_BORDER.upset,   l: 'CORRECT UPSET' },
          { c: CELL_COLORS.wrong,   b: CELL_BORDER.wrong,   l: 'INCORRECT' },
          { c: CELL_COLORS.pending, b: CELL_BORDER.pending, l: 'PENDING' },
        ].map(({ c, b, l }) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, background: c, border: `1px solid ${b}`, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--green-text)', letterSpacing: 1 }}>{l}</span>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: TEAM_COL_W + scoredWeeks.length * CELL_W }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--bg)', width: TEAM_COL_W, minWidth: TEAM_COL_W, padding: '6px 10px', textAlign: 'left', fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                TEAM
              </th>
              {scoredWeeks.map(w => (
                <th key={w.week} style={{ width: CELL_W, minWidth: CELL_W, padding: '6px 2px', textAlign: 'center', fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 0, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                  {w.week === 1 ? 'W0/1' : `W${w.week}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map(team => (
              <tr key={team}>
                <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'var(--bg)', padding: '4px 10px', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: TEAM_COL_W, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--rule-dark)', color: 'var(--text-primary)' }}>
                  {team}
                </td>
                {scoredWeeks.map(w => {
                  const pick = teamPickMap[team]?.[w.week];
                  const state = pickCellState(pick);
                  const isUpset = pick?.pickType === 'upset_loss';
                  // Text color: high contrast against backgrounds
                  const textColor = state === 'upset' ? '#ffffff' : state === 'win' ? '#1a5c35' : state === 'wrong' ? '#c03a2b' : state === 'pending' ? '#a04000' : 'var(--text-muted)';
                  return (
                    <td key={w.week} style={{
                      width: CELL_W, height: CELL_H, textAlign: 'center', verticalAlign: 'middle',
                      background: CELL_COLORS[state], border: `1px solid ${CELL_BORDER[state]}`,
                    }}>
                      {pick && (
                        <div style={{ lineHeight: 1.2 }}>
                          {isUpset && <div style={{ fontSize: 11, color: state === 'upset' ? '#ffe066' : '#a06000' }}>⚡</div>}
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: textColor }}>
                            {state !== 'empty' && state !== 'pending' ? (pick.pointsEarned ?? '?') : '·'}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--green-text)', letterSpacing: 1, marginTop: 10 }}>
        ⚡ = UPSET PICK · NUMBER = POINTS EARNED
      </div>
    </div>
  );
}

// ── H2H Line Chart ──────────────────────────────────────────────────────────
function H2HLineChart({ me, them, weeks }) {
  if (!weeks || weeks.length === 0) return null;
  let myCum = 0, theirCum = 0;
  const chartData = weeks.map(w => {
    const myPts = w.me?.points ?? null;
    const theirPts = w.them?.points ?? null;
    if (myPts !== null) myCum += myPts;
    if (theirPts !== null) theirCum += theirPts;
    return {
      week: w.week === 1 ? 'Wk 0/1' : `Wk ${w.week}`,
      [me.displayName]: myPts !== null ? myCum : null,
      [them.displayName]: theirPts !== null ? theirCum : null,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--font-scoreboard)', fontSize: 14, letterSpacing: 1 }}>
        <div style={{ color: 'var(--amber-pencil)', marginBottom: 6 }}>{label.toUpperCase()}</div>
        {[...payload].sort((a, b) => b.value - a.value).map(entry => (
          <div key={entry.dataKey} style={{ color: entry.color, marginBottom: 3, display: 'flex', gap: 10, justifyContent: 'space-between', minWidth: 140 }}>
            <span>{entry.name}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="score-card" style={{ marginBottom: 16, padding: '20px 16px 8px' }}>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 3, marginBottom: 16 }}>CUMULATIVE POINTS</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,18,16,0.12)" />
          <XAxis dataKey="week" tick={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, fill: 'var(--green-text)', letterSpacing: 1 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, fill: 'var(--green-text)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey={me.displayName} stroke="var(--amber)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
          <Line type="monotone" dataKey={them.displayName} stroke="var(--cream-dim)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function HeadToHead() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [view, setView] = useState('h2h'); // 'h2h' | 'matrix'

  useEffect(() => {
    if (!user) return;
    if (user._id && userId === user._id.toString()) {
      navigate('/explore?tab=matrix');
      return;
    }
    api.get(`/picks/h2h/${userId}`)
      .then(r => {
        setData(r.data);
        if (r.data.weeks?.length > 0) setSelectedWeek(r.data.weeks[r.data.weeks.length - 1].week);
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load comparison'))
      .finally(() => setLoading(false));
  }, [userId, user]);

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING...</div>
    </div>
  );

  if (error) return (
    <div>
      <div className="alert alert-error">{error}</div>
      <button className="btn btn-ghost" onClick={() => navigate(-1)}>← BACK</button>
    </div>
  );

  const { me, them, record, weeks } = data;
  const weekData = weeks.find(w => w.week === selectedWeek);
  const myTotal = weeks.reduce((s, w) => s + (w.me?.points || 0), 0);
  const theirTotal = weeks.reduce((s, w) => s + (w.them?.points || 0), 0);
  const recordColor = record.myWins > record.theirWins ? 'var(--green-pencil)' : record.theirWins > record.myWins ? 'var(--red-pencil)' : 'var(--amber-pencil)';

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>← BACK</button>
        <h1 className="page-title">HEAD TO HEAD</h1>
        <div className="page-subtitle">VS. {them.displayName.toUpperCase()}</div>
      </div>

      {/* ── View toggle ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {[{ key: 'h2h', label: '⚔ HEAD TO HEAD' }, { key: 'matrix', label: `▦ ${them.displayName.split(' ')[0].toUpperCase()}'S PICKS` }].map(t => (
          <button key={t.key} onClick={() => setView(t.key)} style={{
            padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
            borderBottom: `2px solid ${view === t.key ? 'var(--amber)' : 'transparent'}`,
            color: view === t.key ? 'var(--amber)' : 'var(--green-text)',
            fontFamily: 'var(--font-scoreboard)', fontSize: 13, letterSpacing: 1.5, whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── H2H VIEW ── */}
      {view === 'h2h' && (
        <>
          {/* Scoreboard */}
          <div className="score-card gold" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 18, color: 'var(--amber-pencil)' }}>{me.displayName}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>YOU</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, color: 'var(--amber-pencil)', lineHeight: 1, marginTop: 8 }}>{myTotal}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>H2H PTS</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: recordColor, marginTop: 8 }}>{record.myWins}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>WEEK WINS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--green-text)', letterSpacing: 4 }}>VS</div>
                {record.ties > 0 && (
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--text-secondary)', letterSpacing: 1, marginTop: 8 }}>
                    {record.ties} TIE{record.ties > 1 ? 'S' : ''}
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>SEASON</div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, marginTop: 2 }}>
                    <span style={{ color: me.seasonPoints >= them.seasonPoints ? 'var(--amber-pencil)' : 'var(--cream-dim)' }}>{me.seasonPoints}</span>
                    {' — '}
                    <span style={{ color: them.seasonPoints >= me.seasonPoints ? 'var(--amber-pencil)' : 'var(--cream-dim)' }}>{them.seasonPoints}</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 18 }}>{them.displayName}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>OPPONENT</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, color: 'var(--text-secondary)', lineHeight: 1, marginTop: 8 }}>{theirTotal}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>H2H PTS</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: record.theirWins > record.myWins ? 'var(--red-pencil)' : 'var(--cream-dim)', marginTop: 8 }}>{record.theirWins}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>WEEK WINS</div>
              </div>
            </div>
          </div>

          {weeks.length > 0 && <H2HLineChart me={me} them={them} weeks={weeks} />}

          {weeks.length > 0 && (
            <div className="score-card" style={{ marginBottom: 16, padding: '12px 16px' }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 10 }}>WEEK BY WEEK</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {weeks.map(w => {
                  const myW = w.me?.points ?? 0;
                  const theirW = w.them?.points ?? 0;
                  const iWon = myW > theirW, theyWon = theirW > myW, tied = myW === theirW;
                  return (
                    <button key={w.week} onClick={() => setSelectedWeek(w.week)} style={{
                      fontFamily: 'var(--font-display)', fontSize: 13, padding: '6px 10px',
                      background: selectedWeek === w.week ? (iWon ? 'rgba(74,184,112,0.15)' : theyWon ? 'rgba(224,92,92,0.15)' : 'rgba(245,166,35,0.1)') : 'var(--elevated)',
                      border: `1px solid ${selectedWeek === w.week ? (iWon ? 'var(--green-pencil)' : theyWon ? 'var(--red-pencil)' : 'var(--amber-pencil)') : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-primary)',
                    }}>
                      <div>{w.week === 1 ? '0/1' : w.week}</div>
                      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: iWon ? 'var(--green-pencil)' : theyWon ? 'var(--red-pencil)' : 'var(--amber-pencil)', letterSpacing: 1, marginTop: 2 }}>
                        {myW}–{theirW}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {weekData && (
            <div className="score-card">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, marginBottom: 16 }}>
                {weekData.label.toUpperCase()} PICKS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* My picks */}
                <div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber-pencil)', letterSpacing: 2, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{me.displayName.toUpperCase()}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--amber-pencil)' }}>{weekData.me?.points ?? '—'}</span>
                  </div>
                  {weekData.me ? (
                    weekData.me.picks.map((p, i) => (
                      <div key={i} style={{ padding: '8px 10px', marginBottom: 4, background: p.result === 'correct' ? 'rgba(74,184,112,0.08)' : p.result === 'incorrect' ? 'rgba(224,92,92,0.08)' : 'var(--elevated)', border: `1px solid ${p.result === 'correct' ? 'var(--green-pencil)' : p.result === 'incorrect' ? 'var(--red-pencil)' : 'var(--border)'}`, borderRadius: 'var(--radius)' }}>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                          <span>{p.team}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: p.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-pencil)' }}>{p.pointsEarned}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--green-text)', letterSpacing: 1, marginTop: 2 }}>
                          {p.pickType === 'upset_loss' ? '⚡ UPSET' : 'WIN'} · {p.result?.toUpperCase() || 'PENDING'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)' }}>NO SUBMISSION</div>
                  )}
                  {weekData.me?.wasRandyd && <span className="badge badge-red" style={{ marginTop: 6, display: 'inline-block' }}>RANDY'D</span>}
                </div>

                {/* Their picks */}
                <div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--text-secondary)', letterSpacing: 2, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{them.displayName.toUpperCase()}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-secondary)' }}>{weekData.them?.points ?? '—'}</span>
                  </div>
                  {weekData.them ? (
                    weekData.them.picks.map((p, i) => (
                      <div key={i} style={{ padding: '8px 10px', marginBottom: 4, background: p.result === 'correct' ? 'rgba(74,184,112,0.08)' : p.result === 'incorrect' ? 'rgba(224,92,92,0.08)' : 'var(--elevated)', border: `1px solid ${p.result === 'correct' ? 'var(--green-pencil)' : p.result === 'incorrect' ? 'var(--red-pencil)' : 'var(--border)'}`, borderRadius: 'var(--radius)' }}>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                          <span>{p.team}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: p.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-pencil)' }}>{p.pointsEarned}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--green-text)', letterSpacing: 1, marginTop: 2 }}>
                          {p.pickType === 'upset_loss' ? '⚡ UPSET' : 'WIN'} · {p.result?.toUpperCase() || 'PENDING'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)' }}>NO SUBMISSION</div>
                  )}
                  {weekData.them?.wasRandyd && <span className="badge badge-red" style={{ marginTop: 6, display: 'inline-block' }}>RANDY'D</span>}
                </div>
              </div>
            </div>
          )}

          {weeks.length === 0 && (
            <div className="score-card">
              <div className="empty-state"><p>NO SCORED WEEKS YET — CHECK BACK AFTER WEEK 1 IS FINALIZED</p></div>
            </div>
          )}
        </>
      )}

      {/* ── PICKS MATRIX VIEW ── */}
      {view === 'matrix' && (
        <div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 16 }}>
            {them.displayName.toUpperCase()}'S PICKS · TEAMS × WEEKS · SCORED WEEKS ONLY
          </div>
          <PlayerPicksMatrix userId={userId} displayName={them.displayName} />
        </div>
      )}
    </div>
  );
}
