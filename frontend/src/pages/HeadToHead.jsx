import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


function H2HLineChart({ me, them, weeks }) {
  if (!weeks || weeks.length === 0) return null;

  // Cumulative points per week for each player
  let myCum = 0, theirCum = 0;
  const chartData = weeks.map(w => {
    myCum += w.me?.points || 0;
    theirCum += w.them?.points || 0;
    return {
      week: w.week === 1 ? 'Wk 0/1' : `Wk ${w.week}`,
      [me.displayName]: myCum,
      [them.displayName]: theirCum,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--font-scoreboard)', fontSize: 11, letterSpacing: 1 }}>
        <div style={{ color: 'var(--amber)', marginBottom: 6 }}>{label.toUpperCase()}</div>
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
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 3, marginBottom: 16 }}>
        CUMULATIVE POINTS
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="week" tick={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, fill: 'var(--green-text)', letterSpacing: 1 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, fill: 'var(--green-text)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey={me.displayName} stroke="var(--amber)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Line type="monotone" dataKey={them.displayName} stroke="var(--cream-dim)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function HeadToHead() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null);

  useEffect(() => {
    api.get(`/picks/h2h/${userId}`)
      .then(r => {
        setData(r.data);
        if (r.data.weeks?.length > 0) setSelectedWeek(r.data.weeks[r.data.weeks.length - 1].week);
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load comparison'))
      .finally(() => setLoading(false));
  }, [userId]);

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

  const recordColor = record.myWins > record.theirWins ? '#4ab870' : record.theirWins > record.myWins ? '#e05c5c' : 'var(--amber)';

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>← BACK</button>
        <h1 className="page-title">HEAD TO HEAD</h1>
        <div className="page-subtitle">SCORED WEEKS ONLY</div>
      </div>

      {/* Scoreboard */}
      <div className="score-card gold" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
          {/* Me */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 18, color: 'var(--amber)' }}>{me.displayName}</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>YOU</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, color: 'var(--amber)', lineHeight: 1, marginTop: 8 }}>{myTotal}</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>H2H PTS</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: recordColor, marginTop: 8 }}>{record.myWins}</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>WEEK WINS</div>
          </div>

          {/* VS */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--green-text)', letterSpacing: 4 }}>VS</div>
            {record.ties > 0 && (
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--cream-dim)', letterSpacing: 1, marginTop: 8 }}>
                {record.ties} TIE{record.ties > 1 ? 'S' : ''}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>SEASON</div>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, marginTop: 2 }}>
                <span style={{ color: me.seasonPoints >= them.seasonPoints ? 'var(--amber)' : 'var(--cream-dim)' }}>{me.seasonPoints}</span>
                {' — '}
                <span style={{ color: them.seasonPoints >= me.seasonPoints ? 'var(--amber)' : 'var(--cream-dim)' }}>{them.seasonPoints}</span>
              </div>
            </div>
          </div>

          {/* Them */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 18 }}>{them.displayName}</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>OPPONENT</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, color: 'var(--cream-dim)', lineHeight: 1, marginTop: 8 }}>{theirTotal}</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>H2H PTS</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: record.theirWins > record.myWins ? '#e05c5c' : 'var(--cream-dim)', marginTop: 8 }}>{record.theirWins}</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>WEEK WINS</div>
          </div>
        </div>
      </div>

      {/* H2H Line Chart */}
      {weeks.length > 0 && (
        <H2HLineChart me={me} them={them} weeks={weeks} />
      )}

      {/* Week-by-week summary bar */}
      {weeks.length > 0 && (
        <div className="score-card" style={{ marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 10 }}>
            WEEK BY WEEK
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {weeks.map(w => {
              const myW = w.me?.points ?? 0;
              const theirW = w.them?.points ?? 0;
              const iWon = myW > theirW;
              const theyWon = theirW > myW;
              const tied = myW === theirW;
              return (
                <button
                  key={w.week}
                  onClick={() => setSelectedWeek(w.week)}
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: 13, padding: '6px 10px',
                    background: selectedWeek === w.week ? (iWon ? 'rgba(74,184,112,0.15)' : theyWon ? 'rgba(224,92,92,0.15)' : 'rgba(245,166,35,0.1)') : 'var(--elevated)',
                    border: `1px solid ${selectedWeek === w.week ? (iWon ? '#4ab870' : theyWon ? '#e05c5c' : 'var(--amber)') : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--cream)',
                  }}
                >
                  <div>{w.week === 1 ? '0/1' : w.week}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: iWon ? '#4ab870' : theyWon ? '#e05c5c' : 'var(--amber)', letterSpacing: 1, marginTop: 2 }}>
                    {myW}–{theirW}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week detail */}
      {weekData && (
        <div className="score-card">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, marginBottom: 16 }}>
            {weekData.label.toUpperCase()} PICKS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* My picks */}
            <div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--amber)', letterSpacing: 2, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span>{me.displayName.toUpperCase()}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--amber)' }}>{weekData.me?.points ?? '—'}</span>
              </div>
              {weekData.me ? (
                weekData.me.picks.map((p, i) => (
                  <div key={i} style={{
                    padding: '8px 10px', marginBottom: 4,
                    background: p.result === 'correct' ? 'rgba(74,184,112,0.08)' : p.result === 'incorrect' ? 'rgba(224,92,92,0.08)' : 'var(--elevated)',
                    border: `1px solid ${p.result === 'correct' ? '#4ab870' : p.result === 'incorrect' ? '#e05c5c' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                  }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{p.team}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: p.result === 'correct' ? '#4ab870' : '#e05c5c' }}>
                        {p.pointsEarned}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)', letterSpacing: 1, marginTop: 2 }}>
                      {p.pickType === 'upset_loss' ? '⚡ UPSET' : 'WIN'} · {p.result?.toUpperCase() || 'PENDING'}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)' }}>NO SUBMISSION</div>
              )}
              {weekData.me?.wasRandyd && <span className="badge badge-red" style={{ marginTop: 6, display: 'inline-block' }}>RANDY'D</span>}
            </div>

            {/* Their picks */}
            <div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--cream-dim)', letterSpacing: 2, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span>{them.displayName.toUpperCase()}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--cream-dim)' }}>{weekData.them?.points ?? '—'}</span>
              </div>
              {weekData.them ? (
                weekData.them.picks.map((p, i) => (
                  <div key={i} style={{
                    padding: '8px 10px', marginBottom: 4,
                    background: p.result === 'correct' ? 'rgba(74,184,112,0.08)' : p.result === 'incorrect' ? 'rgba(224,92,92,0.08)' : 'var(--elevated)',
                    border: `1px solid ${p.result === 'correct' ? '#4ab870' : p.result === 'incorrect' ? '#e05c5c' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                  }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{p.team}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: p.result === 'correct' ? '#4ab870' : '#e05c5c' }}>
                        {p.pointsEarned}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)', letterSpacing: 1, marginTop: 2 }}>
                      {p.pickType === 'upset_loss' ? '⚡ UPSET' : 'WIN'} · {p.result?.toUpperCase() || 'PENDING'}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)' }}>NO SUBMISSION</div>
              )}
              {weekData.them?.wasRandyd && <span className="badge badge-red" style={{ marginTop: 6, display: 'inline-block' }}>RANDY'D</span>}
            </div>
          </div>
        </div>
      )}

      {weeks.length === 0 && (
        <div className="score-card">
          <div className="empty-state">
            <p>NO SCORED WEEKS YET — CHECK BACK AFTER WEEK 1 IS FINALIZED</p>
          </div>
        </div>
      )}
    </div>
  );
}
