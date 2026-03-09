// MyHistory.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export function MyHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [availableTeams, setAvailableTeams] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/picks/my-history'),
      api.get('/picks/available-teams'),
    ]).then(([h, t]) => {
      setHistory(h.data.history || []);
      setAvailableTeams(t.data);
      if (h.data.history?.length > 0) {
        setSelectedWeek(h.data.history[h.data.history.length - 1].week);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen" style={{ minHeight: '60vh' }}><div className="logo-flash" style={{ fontSize: 28 }}>LOADING...</div></div>;

  const totalPoints = history.reduce((s, w) => s + (w.totalPoints || 0), 0);
  const scored = history.filter(w => w.isScored);
  const bestWeek = scored.length ? scored.reduce((b, w) => w.totalPoints > b.totalPoints ? w : b) : null;
  const selectedData = history.find(h => h.week === selectedWeek);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">MY HISTORY</h1>
        <div className="page-subtitle">@{user?.username} · 2026 SEASON</div>
      </div>

      <div className="stat-strip">
        <div className="stat-cell"><div className="stat-number dim">{totalPoints}</div><div className="stat-label">SEASON PTS</div></div>
        <div className="stat-cell"><div className="stat-number cream">{history.length}</div><div className="stat-label">WEEKS FILED</div></div>
        <div className="stat-cell"><div className="stat-number green">{bestWeek?.totalPoints || 0}</div><div className="stat-label">BEST WEEK{bestWeek ? ` (W${bestWeek.week === 1 ? '0/1' : bestWeek.week})` : ''}</div></div>
        <div className="stat-cell"><div className="stat-number red">{availableTeams?.usedCount || 0}</div><div className="stat-label">TEAMS USED</div></div>
      </div>

      {history.length === 0 ? (
        <div className="score-card">
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p>NO PICKS SUBMITTED YET</p>
            <Link to="/picks" className="btn btn-primary" style={{ marginTop: 16 }}>SUBMIT FIRST PICKS →</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="week-tabs">
            {history.map(w => (
              <button
                key={w.week}
                className={`week-tab ${selectedWeek === w.week ? 'active' : ''} ${w.isScored ? 'scored' : ''}`}
                onClick={() => setSelectedWeek(w.week)}
              >
                WK {w.week === 1 ? '0/1' : w.week}
                {w.isScored && <span style={{ display: 'block', fontSize: 13, marginTop: 1 }}>{w.totalPoints}PT</span>}
              </button>
            ))}
          </div>

          {selectedData && (
            <div className="score-card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2 }}>
                    WEEK {selectedData.week === 1 ? '0/1' : selectedData.week} PICKS
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 1, marginTop: 3 }}>
                    FILED: {new Date(selectedData.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}
                    {selectedData.wasRandyd && <span className="badge badge-red" style={{ marginLeft: 8 }}>RANDY'D</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {selectedData.isScored && (
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--amber)', lineHeight: 1 }}>
                      {selectedData.totalPoints}<span style={{ fontSize: 14, color: 'var(--green-text)' }}>PTS</span>
                    </div>
                  )}
                  {!selectedData.isLocked && (
                    <Link to={`/picks/${selectedData.week}`} className="btn btn-ghost btn-sm">EDIT</Link>
                  )}
                </div>
              </div>

              {selectedData.picks.map((pick, i) => (
                <div key={i} className={`pick-slot ${pick.result || 'pending'}`}>
                  <div className="pick-num">{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div className="pick-team-name">{pick.team}</div>
                    <div className="pick-type-tag">{pick.pickType === 'win_vs_power4' ? 'WIN VS P4 · 1PT' : 'UPSET LOSS · 2PTS'}</div>
                  </div>
                  {selectedData.isScored ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: pick.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-score)' }}>{pick.pointsEarned}pt</div>
                      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: pick.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-score)', letterSpacing: 1 }}>{pick.result?.toUpperCase()}</div>
                    </div>
                  ) : (
                    <span className="badge badge-gray">PENDING</span>
                  )}
                </div>
              ))}

              {/* Commissioner adjustments */}
              {selectedData.commissionerAdjustments?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {selectedData.commissionerAdjustments.map((adj, i) => (
                    <div key={i} className="pick-slot" style={{ borderColor: 'rgba(245,166,35,0.3)', background: 'rgba(245,166,35,0.04)' }}>
                      <div className="pick-num" style={{ color: 'var(--amber)' }}>⚑</div>
                      <div style={{ flex: 1 }}>
                        <div className="pick-team-name" style={{ color: 'var(--amber)', fontSize: 13 }}>COMMISSIONER ADJUSTMENT</div>
                        <div className="pick-type-tag">{adj.reason || 'Manual adjustment'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: adj.delta >= 0 ? 'var(--green-pencil)' : 'var(--red-pencil)' }}>
                          {adj.delta >= 0 ? '+' : ''}{adj.delta}pt
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Teams used */}
          {availableTeams && (
            <div className="score-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2 }}>TEAMS USED THIS SEASON</div>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 1 }}>{availableTeams.usedCount}/68</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {availableTeams.usedTeams.map(t => (
                  <span key={t} className="badge badge-gray">{t}</span>
                ))}
                {availableTeams.usedCount === 0 && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--green-text)' }}>NONE YET</span>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── RULES PAGE ────────────────────────────────────────────────────────────────
export function Rules() {
  const sections = [
    {
      title: 'THE CONCEPT',
      content: "68 Ski-Doo is a season-long college football pick'em. Each player selects from the 68 Power 4 + Notre Dame teams across 14 weeks, earning points for correct predictions. Each team can only be used ONCE per season. No bowls or conference championships."
    },
    {
      title: 'WEEKLY PICKS',
      bullets: [
        'Weeks 1 (0/1) and 2: 4 picks each. Weeks 3-14: 5 picks each. Total: 68 picks across the season.',
        'Deadline is Friday at noon each week.',
        'Exception: any team playing on Thursday must be picked by Thursday noon. You can still edit other picks until Friday noon.',
        'Thursday games show a warning and are greyed out after the Thursday noon deadline.',
        'If you run low on valid teams late in the season, you may submit fewer than the maximum picks.',
        "If you do not submit by the Friday deadline, Randy the Randomizer picks for you.",
      ]
    },
    {
      title: 'SCORING',
      bullets: [
        '1 POINT - Pick a Power 4 team to WIN against another Power 4 team.',
        '2 POINTS - Pick a Power 4 team to LOSE to a non-Power 4 team (the upset).',
        '0.5 POINTS - Tie game: win picks score 0.5pt, upset picks score 1pt.',
        'FCS opponents: a P4 team can only be picked to LOSE (upset) vs an FCS opponent, never to win.',
        'Each team can only be used once per season total (win pick OR upset pick, not both).',
      ]
    },
    {
      title: 'TIEBREAKERS',
      bullets: [
        'Season tiebreaker: player with more total upset picks made wins.',
        'Weekly pot: two-way tie splits evenly. Three-or-more-way tie rolls the pot to the following week.',
      ]
    },
    {
      title: 'WEEKLY PRIZE',
      content: "$70 to the weekly high scorer. Two-way tie: $35 each. Three-or-more-way tie: the pot rolls over and compounds. Commissioner handles payouts manually."
    },
    {
      title: 'SEASON PRIZES',
      bullets: [
        '1st place: 70% of the season pool',
        '2nd place: 20% of the season pool',
        '3rd place: 10% of the season pool',
        'Consolation: $70 returned to last place',
      ]
    },
    {
      title: 'RANDY THE RANDOMIZER',
      content: "If you have not submitted picks by the Friday noon deadline, Randy fires automatically. Randy picks from your remaining available (unused) teams. Randy picks count fully toward standings and payouts. Randy cannot be stopped or reversed. You will receive an email showing what Randy chose."
    },
    {
      title: 'CANCELLED & POSTPONED GAMES',
      content: "If a game is cancelled or postponed, any picks for that team score 0 points. The team is not returned to your available pool."
    },
    {
      title: 'THE 68 TEAMS',
      content: "ACC (17): Boston College, Cal, Clemson, Duke, Florida State, Georgia Tech, Louisville, Miami, NC State, North Carolina, Pitt, SMU, Stanford, Syracuse, Virginia Tech, Virginia, Wake Forest.\nBig Ten (18): Illinois, Indiana, Iowa, Maryland, Michigan, Michigan State, Minnesota, Nebraska, Northwestern, Ohio State, Oregon, Penn State, Purdue, Rutgers, UCLA, USC, Washington, Wisconsin.\nBig 12 (16): Arizona, Arizona State, Baylor, BYU, Cincinnati, Colorado, Houston, Iowa State, Kansas, Kansas State, Oklahoma State, TCU, Texas Tech, UCF, Utah, West Virginia.\nSEC (16): Alabama, Arkansas, Auburn, Florida, Georgia, Kentucky, LSU, Mississippi State, Missouri, Oklahoma, Ole Miss, South Carolina, Tennessee, Texas, Texas A&M, Vanderbilt.\nIndependent (1): Notre Dame."
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">RULES</h1>
        <div className="page-subtitle">68 SKI-DOO · 2026 OFFICIAL RULES</div>
      </div>
      {sections.map(s => (
        <div key={s.title} className="score-card" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, color: 'var(--amber)', marginBottom: 12 }}>{s.title}</div>
          {s.content && s.content.split('\n').map((line, i) => line.trim() && (
            <p key={i} style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--cream-dim)', lineHeight: 1.75, letterSpacing: 0.3, marginBottom: 6 }}>{line}</p>
          ))}
          {s.bullets && (
            <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
              {s.bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--cream-dim)', lineHeight: 1.6, letterSpacing: 0.3 }}>
                  <span style={{ color: 'var(--amber)', flexShrink: 0 }}>&#9658;</span>{b}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ── PROFILE PAGE ──────────────────────────────────────────────────────────────
export function Profile() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await api.patch('/auth/profile', { displayName });
      await refreshUser();
      setMsg('PROFILE UPDATED');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.error || 'UPDATE FAILED');
    } finally { setSaving(false); }
  };

  const resend = async () => {
    await api.post('/auth/resend-verification');
    setMsg('VERIFICATION EMAIL SENT');
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">PROFILE</h1>
        <div className="page-subtitle">@{user?.username}</div>
      </div>

      {msg && <div className={`alert ${msg.includes('FAILED') ? 'alert-error' : 'alert-success'}`}>{msg}</div>}

      <div className="score-card" style={{ maxWidth: 480 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, marginBottom: 20 }}>ACCOUNT DETAILS</div>
        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">DISPLAY NAME</label>
            <input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={40} required />
          </div>
          <div className="form-group">
            <label className="form-label">USERNAME</label>
            <input className="form-input" value={user?.username} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">EMAIL</label>
            <input className="form-input" value={user?.email} readOnly />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <span className={`badge ${user?.emailVerified ? 'badge-green' : 'badge-red'}`}>
              EMAIL {user?.emailVerified ? 'VERIFIED' : 'UNVERIFIED'}
            </span>
            {!user?.emailVerified && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={resend}>RESEND VERIFICATION</button>
            )}
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </form>
      </div>

      <div className="score-card" style={{ maxWidth: 480, marginTop: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, marginBottom: 16 }}>SEASON STATS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['SEASON POINTS', user?.seasonPoints || 0],
            ['TEAMS USED', `${user?.usedTeams?.length || 0}/68`],
            ['ENTRY FEE', user?.hasPaid ? 'PAID ✓' : 'PENDING'],
            ['ROLE', user?.isAdmin ? 'COMMISSIONER' : 'SKI-DOOZER'],
          ].map(([label, val]) => (
            <div key={label} style={{ background: 'var(--elevated)', border: '1px solid var(--border)', padding: '12px 14px', borderRadius: 'var(--radius)' }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--amber)', marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
