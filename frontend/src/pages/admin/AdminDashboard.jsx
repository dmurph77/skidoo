import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const load = () => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/health'),
    ]).then(([dashRes, healthRes]) => {
      setData(dashRes.data);
      setHealth(healthRes.data);
      const openWeek = dashRes.data.weeks?.find(w => w.isOpen);
      setNotes(openWeek?.notes || '');
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const saveNotes = async () => {
    if (!data?.stats?.openWeek) return;
    setSavingNotes(true);
    try {
      await api.patch(`/admin/weeks/${data.stats.openWeek}/notes`, { notes });
      setMsg({ text: '✓ NOTES SAVED', type: 'success' });
      setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    } catch (err) {
      setMsg({ text: 'Failed to save notes', type: 'error' });
    } finally { setSavingNotes(false); }
  };

  const sendReminder = async () => {
    if (!data?.stats?.openWeek) return;
    if (!window.confirm(`Send reminder email to all players who haven't submitted Week ${data.stats.openWeek}?`)) return;
    setReminding(true);
    try {
      const r = await api.post(`/admin/weeks/${data.stats.openWeek}/remind`);
      setMsg({ text: `✓ REMINDER SENT TO ${r.data.sent} PLAYER${r.data.sent !== 1 ? 'S' : ''}`, type: 'success' });
    } catch (err) {
      setMsg({ text: 'Failed to send reminders', type: 'error' });
    } finally { setReminding(false); }
  };

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING...</div>
    </div>
  );

  const { stats, missingPlayers, weeks } = data;
  const openWeekConfig = weeks?.find(w => w.isOpen);
  const hoursLeft = openWeekConfig?.deadline
    ? Math.max(0, (new Date(openWeekConfig.deadline) - new Date()) / 3600000)
    : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">COMMISSIONER</h1>
        <div className="page-subtitle">68 SKI-DOO 2025 · ADMIN PANEL</div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* Main stats */}
      <div className="stat-strip" style={{ marginBottom: 16 }}>
        <div className="stat-cell">
          <div className="stat-number">{stats.totalPlayers}</div>
          <div className="stat-label">PLAYERS</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number" style={{ color: stats.paidPlayers === stats.totalPlayers ? '#4ab870' : 'var(--amber)' }}>
            {stats.paidPlayers}/{stats.totalPlayers}
          </div>
          <div className="stat-label">PAID</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number" style={{ color: 'var(--amber)' }}>${stats.weeklyPot}</div>
          <div className="stat-label">WEEK POT{stats.rolloverAmount > 0 ? ' +ROLLOVER' : ''}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number dim">${stats.seasonPot}</div>
          <div className="stat-label">SEASON POT</div>
        </div>
      </div>

      {/* Quick nav */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { to: '/admin/invites',    icon: '✉', label: 'INVITES'  },
          { to: '/admin/weeks',      icon: '◎', label: 'WEEKS'    },
          { to: '/admin/users',      icon: '◉', label: 'PLAYERS'  },
          { to: '/admin/directions', icon: '?', label: 'PLAYBOOK' },
        ].map(({ to, icon, label }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <div className="score-card" style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 12px' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber-dim)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: 2, color: 'var(--amber)' }}>{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Open week health */}
      {stats.openWeek && (
        <div className="score-card" style={{ marginBottom: 16, borderColor: missingPlayers.length > 0 ? 'rgba(224,92,92,0.3)' : '#2a7a4a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2 }}>
                WEEK {stats.openWeek === 1 ? '0/1' : stats.openWeek} · SUBMISSION HEALTH
              </div>
              {hoursLeft != null && (
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, letterSpacing: 1, marginTop: 3,
                  color: hoursLeft < 6 ? '#e05c5c' : hoursLeft < 24 ? 'var(--amber)' : '#4ab870'
                }}>
                  {hoursLeft < 1 ? 'DEADLINE PASSED' : hoursLeft < 24 ? `${Math.floor(hoursLeft)}H UNTIL DEADLINE` : `${Math.floor(hoursLeft/24)}D UNTIL DEADLINE`}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {missingPlayers.length > 0 && (
                <button className="btn btn-outline btn-sm" onClick={sendReminder} disabled={reminding}>
                  {reminding ? 'SENDING...' : `📧 REMIND ${missingPlayers.length} MISSING`}
                </button>
              )}
              <Link to={`/admin/scoring/${stats.openWeek}`} className="btn btn-primary btn-sm">
                SCORE WEEK →
              </Link>
            </div>
          </div>

          {/* Submission progress bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: '#4ab870', letterSpacing: 1 }}>
                {stats.totalPlayers - missingPlayers.length} SUBMITTED
              </span>
              <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: missingPlayers.length > 0 ? '#e05c5c' : '#4ab870', letterSpacing: 1 }}>
                {missingPlayers.length} MISSING
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
              <div style={{
                height: 6, borderRadius: 3, transition: 'width 0.5s',
                width: `${stats.totalPlayers > 0 ? ((stats.totalPlayers - missingPlayers.length) / stats.totalPlayers) * 100 : 0}%`,
                background: missingPlayers.length === 0 ? '#4ab870' : 'var(--amber)',
              }} />
            </div>
          </div>

          {missingPlayers.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-scoreboard)', color: '#4ab870', fontSize: 12, letterSpacing: 1 }}>
              ✓ ALL PLAYERS HAVE SUBMITTED
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {missingPlayers.map(p => (
                <span key={p._id} style={{
                  fontFamily: 'var(--font-condensed)', fontSize: 13, fontWeight: 700,
                  background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)',
                  borderRadius: 'var(--radius)', padding: '3px 10px', color: '#e05c5c'
                }}>{p.displayName}</span>
              ))}
            </div>
          )}

          {/* Commissioner notes */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--amber)', letterSpacing: 2, marginBottom: 8 }}>
              COMMISSIONER NOTE — VISIBLE TO ALL PLAYERS ON THEIR DASHBOARD
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                style={{ flex: 1, fontSize: 13 }}
                placeholder="E.G. 'BOWL GAME PICKS — DEADLINE EXTENDED TO FRIDAY'"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={200}
              />
              <button className="btn btn-ghost btn-sm" onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? '...' : 'SAVE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoring shortcut */}
      {stats.latestScoredWeek && (
        <div className="score-card" style={{ marginBottom: 16, padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700 }}>
              LAST SCORED: WEEK {stats.latestScoredWeek === 1 ? '0/1' : stats.latestScoredWeek}
            </div>
            <Link to={`/admin/scoring/${stats.latestScoredWeek}`} className="btn btn-ghost btn-sm">VIEW RESULTS</Link>
          </div>
        </div>
      )}


      {/* System Health Panel */}
      {health && (
        <div className="score-card" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            SYSTEM HEALTH
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2 }}>
              AS OF {new Date(health.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase()}
            </span>
          </div>

          {/* Stuck weeks warning */}
          {health.stuckWeeks?.length > 0 && (
            <div className="alert alert-error" style={{ marginBottom: 12 }}>
              {health.stuckWeeks.length} WEEK{health.stuckWeeks.length > 1 ? 'S' : ''} PAST DEADLINE WITH NO ACTION:{' '}
              {health.stuckWeeks.map(w => `Week ${w.week}`).join(', ')}. Randy may not have fired — check logs.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {/* Open week */}
            <div style={{ padding: '12px 14px', background: 'var(--elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 6 }}>OPEN WEEK</div>
              {health.openWeek ? (
                <>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--amber)' }}>
                    WK {health.openWeek.week === 1 ? '0/1' : health.openWeek.week}
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, letterSpacing: 1, marginTop: 4,
                    color: health.openWeek.hoursUntilDeadline < 6 ? '#e05c5c' : health.openWeek.hoursUntilDeadline < 24 ? 'var(--amber)' : '#4ab870'
                  }}>
                    {health.openWeek.hoursUntilDeadline < 0 ? 'DEADLINE PASSED'
                      : health.openWeek.hoursUntilDeadline < 24 ? `${Math.floor(health.openWeek.hoursUntilDeadline)}H LEFT`
                      : `${Math.floor(health.openWeek.hoursUntilDeadline / 24)}D LEFT`}
                  </div>
                </>
              ) : (
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--cream-dim)' }}>NONE</div>
              )}
            </div>

            {/* Last scored */}
            <div style={{ padding: '12px 14px', background: 'var(--elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 6 }}>LAST SCORED</div>
              {health.lastScored ? (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: '#4ab870' }}>
                  WK {health.lastScored.week === 1 ? '0/1' : health.lastScored.week}
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--cream-dim)' }}>NONE YET</div>
              )}
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginTop: 4 }}>
                {health.weeksScored}/{health.weeksConfigured} WEEKS DONE
              </div>
            </div>

            {/* Randy status */}
            <div style={{ padding: '12px 14px', background: 'var(--elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 6 }}>RANDY</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: health.randy.totalRandydThisSeason > 0 ? 'var(--amber)' : '#4ab870' }}>
                {health.randy.totalRandydThisSeason}
              </div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginTop: 4 }}>
                PICKS THIS SEASON
                {health.randy.lastRunWeek && ` · LAST WK ${health.randy.lastRunWeek}`}
              </div>
            </div>

            {/* Players */}
            <div style={{ padding: '12px 14px', background: 'var(--elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 6 }}>ACTIVE PLAYERS</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--cream)' }}>
                {health.activePlayers}
              </div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginTop: 4 }}>
                VERIFIED & ACTIVE
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Week list */}
      <div className="score-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2 }}>SEASON WEEKS</div>
          <Link to="/admin/weeks" className="btn btn-ghost btn-sm">CONFIGURE →</Link>
        </div>
        {weeks.length === 0 ? (
          <div className="empty-state"><p>NO WEEKS CONFIGURED — GO TO MANAGE WEEKS</p></div>
        ) : (
          weeks.map(w => (
            <div key={w.week} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--amber)', width: 44 }}>
                  {w.week === 1 ? '0/1' : w.week}
                </span>
                <div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700 }}>{w.label || `WEEK ${w.week}`}</div>
                  {w.deadline && (
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1 }}>
                      {new Date(w.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {w.isOpen   && <span className="badge badge-amber">OPEN</span>}
                {w.isScored && <span className="badge badge-green">SCORED</span>}
                <Link to={`/admin/scoring/${w.week}`} className="btn btn-ghost btn-sm">SCORE</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
