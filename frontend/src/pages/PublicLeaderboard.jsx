import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '/api';

const thStyle = {
  fontFamily: 'var(--font-scoreboard)', fontSize: 11, letterSpacing: 2,
  color: 'var(--green-text)', padding: '8px 6px', borderBottom: '1px solid var(--border)',
  fontWeight: 400, whiteSpace: 'nowrap',
};

function SeasonTable({ standings }) {
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
          {standings.map((p, i) => (
            <tr key={p.username} style={{ background: 'transparent', borderBottom: '1px solid var(--rule-dark)' }}>
              <td style={{ textAlign: 'center', fontFamily: i < 3 ? 'inherit' : 'var(--font-display)', fontSize: i < 3 ? 18 : 15, padding: '9px 4px', color: 'var(--text-muted)', width: 40 }}>
                {i < 3 ? medals[i] : i + 1}
              </td>
              <td style={{ padding: '9px 12px' }}>
                <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  {p.displayName}
                </div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--green-text)', letterSpacing: 1, marginTop: 1 }}>
                  @{p.username}
                </div>
              </td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', padding: '9px 10px' }}>
                {p.seasonPoints}
              </td>
              <td style={{ textAlign: 'right', padding: '9px 14px 9px 6px', fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 1 }}>
                {p.teamsUsed}/68
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoricalTable({ standings, scoredWeeks }) {
  if (!scoredWeeks?.length) return null;
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
              const wkMap = {};
              (p.weeklyPoints || []).forEach(wp => { wkMap[wp.week] = wp.points; });
              return (
                <tr key={p.username} style={{ borderBottom: '1px solid var(--rule-dark)' }}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'var(--bg)', padding: '8px 12px', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, borderRight: '1px solid var(--border)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
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
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, padding: '8px 12px', borderLeft: '1px solid var(--border)', color: 'var(--text-primary)' }}>
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

export default function PublicLeaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('standings'); // 'standings' | 'historical'
  const [histView, setHistView] = useState('table');

  useEffect(() => {
    fetch(`${API}/picks/leaderboard/public`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load standings'); setLoading(false); });
  }, []);

  const standings = data?.seasonStandings || [];
  const scoredWeeks = (data?.weeks || []).filter(w => w.isScored);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 60px' }}>

      {/* Header */}
      <div style={{ background: 'var(--green-dark)', borderBottom: '4px solid var(--amber)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 4, color: 'var(--amber-pencil)' }}>68 SKI-DOO</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 3, marginTop: 2 }}>
            2026 COLLEGE FOOTBALL PICK'EM
          </div>
        </div>
        <Link to="/login" className="btn btn-primary btn-sm">SIGN IN →</Link>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

        <div className="page-header">
          <h1 className="page-title">STANDINGS</h1>
          <div className="page-subtitle">
            {data?.lastScoredWeek ? `UPDATED THROUGH ${data.lastScoredWeek.toUpperCase()}` : '2026 SEASON IN PROGRESS'}
          </div>
        </div>

        {loading && (
          <div className="score-card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--amber-pencil)' }}>LOADING...</div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {!loading && standings.length === 0 && (
          <div className="score-card">
            <div className="empty-state">
              <span className="empty-icon">🏈</span>
              <p>SEASON HASN'T STARTED YET — CHECK BACK WEEK 1</p>
            </div>
          </div>
        )}

        {!loading && standings.length > 0 && (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
              {[{ key: 'standings', label: 'STANDINGS' }, { key: 'historical', label: 'HISTORICAL' }].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
                  borderBottom: `2px solid ${tab === t.key ? 'var(--amber)' : 'transparent'}`,
                  color: tab === t.key ? 'var(--amber)' : 'var(--green-text)',
                  fontFamily: 'var(--font-scoreboard)', fontSize: 13, letterSpacing: 1.5, whiteSpace: 'nowrap',
                }}>{t.label}</button>
              ))}
            </div>

            {tab === 'standings' && <SeasonTable standings={standings} />}

            {tab === 'historical' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {[{ key: 'table', label: '▦ POINTS TABLE' }].map(t => (
                    <button key={t.key} className="btn btn-sm btn-outline"
                      style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {scoredWeeks.length > 0
                  ? <HistoricalTable standings={standings} scoredWeeks={scoredWeeks} />
                  : <div className="score-card"><div className="empty-state"><p>NO SCORED WEEKS YET</p></div></div>
                }
              </>
            )}

            {data?.updatedAt && (
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, textAlign: 'center', marginTop: 16 }}>
                LAST UPDATED {new Date(data.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}
              </div>
            )}
          </>
        )}

        {/* Join CTA */}
        <div className="score-card" style={{ marginTop: 24, textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 3, marginBottom: 8 }}>WANT IN?</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 8 }}>INVITE-ONLY LEAGUE</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 20 }}>
            EMAIL <a href="mailto:skidoobot@gmail.com" style={{ color: 'var(--amber-pencil)' }}>SKIDOOBOT@GMAIL.COM</a> TO GET ON THE LIST
          </div>
          <Link to="/how-to-play" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 2, display: 'block', marginBottom: 16 }}>
            HOW TO PLAY →
          </Link>
          <Link to="/login" className="btn btn-primary">SIGN IN →</Link>
        </div>
      </div>
    </div>
  );
}
