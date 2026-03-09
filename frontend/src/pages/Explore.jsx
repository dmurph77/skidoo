import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// TAB DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'reveal',   label: 'THIS WEEK',      icon: '◐' },
  { key: 'teams',    label: 'MY TEAMS',       icon: '⊞' },
  { key: 'history',  label: 'MY PICK HISTORY', icon: '◷' },
  { key: 'explorer', label: 'TEAM EXPLORER',  icon: '◎' },
  { key: 'matrix',   label: 'PICKS MATRIX',   icon: '▦' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UTILS
// ─────────────────────────────────────────────────────────────────────────────
function pct(prob) { return prob == null ? null : Math.round(prob * 100); }
function probColor(prob) {
  if (prob == null) return 'var(--green-text)';
  if (prob >= 0.70) return '#4ab870';
  if (prob >= 0.50) return 'var(--cream-dim)';
  if (prob >= 0.35) return 'var(--amber)';
  return '#e05c5c';
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
      {loading && !data && <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>LOADING PICKS...</div>}
      {data && (
        <>
          <div className="score-card" style={{ marginBottom: 16, padding: '12px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2 }}>{weekLabel(selectedWeek).toUpperCase()}</div>
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
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--cream-dim)' }}>{reveal.filter(s => s.wasRandyd).length}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>RANDY'D</div>
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
          {sorted.map((s, i) => {
            const isMe = s.userId?.toString() === user?._id?.toString();
            const isExpanded = expandedPlayer === s.userId;
            return (
              <div key={s.userId} style={{ background: 'var(--card)', border: `1px solid ${isMe ? 'var(--amber-dim)' : 'var(--border)'}`, borderRadius: 'var(--radius)', marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }} onClick={() => setExpandedPlayer(isExpanded ? null : s.userId)}>
                  {isScored && <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--amber)', width: 32, flexShrink: 0, textAlign: 'center' }}>{i + 1}</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {s.displayName}
                      {isMe && <span className="badge badge-amber" style={{ fontSize: 9 }}>YOU</span>}
                      {s.wasRandyd && <span className="badge badge-red" style={{ fontSize: 9 }}>RANDY'D</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {s.picks.map((p, pi) => (
                        <span key={pi} style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, letterSpacing: 0.5, padding: '2px 6px', borderRadius: 3,
                          background: p.pickType === 'upset_loss' ? 'rgba(245,166,35,0.1)' : 'var(--elevated)',
                          border: `1px solid ${p.result === 'correct' ? '#4ab870' : p.result === 'incorrect' ? '#e05c5c' : p.pickType === 'upset_loss' ? 'var(--amber-dim)' : 'var(--border)'}`,
                          color: p.result === 'correct' ? '#4ab870' : p.result === 'incorrect' ? '#e05c5c' : p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--cream-dim)',
                        }}>{p.team}{p.pickType === 'upset_loss' ? ' ⚡' : ''}{p.result === 'correct' ? ' ✓' : p.result === 'incorrect' ? ' ✗' : ''}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                    {isScored && <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--amber)', lineHeight: 1 }}>{s.totalPoints}</div><div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>PTS</div></div>}
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</div>
                  </div>
                </div>
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
                          {teamPickMap[p.team]?.length > 1 && (
                            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 0.5, marginTop: 2 }}>
                              ALSO PICKED BY: {teamPickMap[p.team].filter(x => x.player !== s.displayName).map(x => x.player).join(', ')}
                            </div>
                          )}
                        </div>
                        {isScored && (
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: p.result === 'correct' ? '#4ab870' : '#e05c5c' }}>{p.pointsEarned}pt</div>
                            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: p.result === 'correct' ? '#4ab870' : '#e05c5c', letterSpacing: 1 }}>{p.result?.toUpperCase()}</div>
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
// MY TEAMS (availability grid — clicking sends to Team Explorer)
// ─────────────────────────────────────────────────────────────────────────────
function MyTeams({ user, onViewTeam }) {
  const [filter, setFilter] = useState('all');
  const usedSet = new Set(user?.usedTeams || []);
  const total = 68, used = usedSet.size, remaining = total - used;

  return (
    <div>
      <div className="stat-strip" style={{ marginBottom: 16 }}>
        <div className="stat-cell"><div className="stat-number" style={{ color: '#4ab870' }}>{remaining}</div><div className="stat-label">AVAILABLE</div></div>
        <div className="stat-cell"><div className="stat-number dim">{used}</div><div className="stat-label">USED</div></div>
        <div className="stat-cell"><div className="stat-number">{total}</div><div className="stat-label">TOTAL</div></div>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, marginBottom: 20 }}>
        <div style={{ height: 8, borderRadius: 4, width: `${(used / total) * 100}%`, background: used > 50 ? '#e05c5c' : used > 30 ? 'var(--amber)' : 'var(--amber-dim)', transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ key: 'all', label: 'ALL TEAMS' }, { key: 'available', label: `AVAILABLE (${remaining})` }, { key: 'used', label: `USED (${used})` }].map(({ key, label }) => (
          <button key={key} className={`btn btn-sm ${filter === key ? 'btn-outline' : 'btn-ghost'}`}
            style={{ borderColor: filter === key ? 'var(--amber)' : undefined, color: filter === key ? 'var(--amber)' : undefined }}
            onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {Object.entries(CONFERENCES).map(([conf, teams]) => {
        const filtered = teams.filter(t => filter === 'available' ? !usedSet.has(t) : filter === 'used' ? usedSet.has(t) : true);
        if (filtered.length === 0) return null;
        const confUsed = teams.filter(t => usedSet.has(t)).length;
        return (
          <div key={conf} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 3, color: 'var(--amber)' }}>{conf}</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1 }}>{teams.length - confUsed}/{teams.length} LEFT</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
              {filtered.map(team => {
                const isUsed = usedSet.has(team);
                return (
                  <div key={team} onClick={() => onViewTeam(team)}
                    style={{ padding: '10px 12px', background: isUsed ? 'var(--green-deep)' : 'var(--elevated)', border: `1px solid ${isUsed ? 'var(--border)' : 'var(--amber-dim)'}`, borderRadius: 'var(--radius)', opacity: isUsed ? 0.55 : 1, cursor: 'pointer', transition: 'opacity 0.15s, border-color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = isUsed ? 'var(--border)' : 'var(--amber-dim)'; e.currentTarget.style.opacity = isUsed ? '0.55' : '1'; }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, color: isUsed ? 'var(--cream-dim)' : 'var(--cream)' }}>{team}</div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: isUsed ? 'var(--red-score)' : '#4ab870', letterSpacing: 1, marginTop: 2 }}>{isUsed ? 'USED · VIEW SCHEDULE →' : 'AVAILABLE · VIEW →'}</div>
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

  if (loading) return <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>LOADING...</div>;
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
            {w.isScored && <span style={{ display: 'block', fontSize: 9, marginTop: 1 }}>{w.totalPoints}PT</span>}
          </button>
        ))}
      </div>
      {selectedData && (
        <div className="score-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2 }}>WEEK {selectedData.week === 1 ? '0/1' : selectedData.week} PICKS</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1, marginTop: 3 }}>
                FILED: {new Date(selectedData.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}
                {selectedData.wasRandyd && <span className="badge badge-red" style={{ marginLeft: 8 }}>RANDY'D</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {selectedData.isScored && <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--amber)', lineHeight: 1 }}>{selectedData.totalPoints}<span style={{ fontSize: 14, color: 'var(--green-text)' }}>PTS</span></div>}
              {!selectedData.isLocked && <Link to={`/picks/${selectedData.week}`} className="btn btn-ghost btn-sm">EDIT</Link>}
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
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: pick.result === 'correct' ? '#4ab870' : 'var(--red-score)' }}>{pick.pointsEarned}pt</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: pick.result === 'correct' ? '#4ab870' : 'var(--red-score)', letterSpacing: 1 }}>{pick.result?.toUpperCase()}</div>
                </div>
              ) : <span className="badge badge-gray">PENDING</span>}
            </div>
          ))}
          {selectedData.commissionerAdjustments?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {selectedData.commissionerAdjustments.map((adj, i) => (
                <div key={i} className="pick-slot" style={{ borderColor: 'rgba(245,166,35,0.3)', background: 'rgba(245,166,35,0.04)' }}>
                  <div className="pick-num" style={{ color: 'var(--amber)' }}>⚑</div>
                  <div style={{ flex: 1 }}><div className="pick-team-name" style={{ color: 'var(--amber)', fontSize: 13 }}>COMMISSIONER ADJUSTMENT</div><div className="pick-type-tag">{adj.reason || 'Manual adjustment'}</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: adj.delta >= 0 ? '#4ab870' : '#e05c5c' }}>{adj.delta >= 0 ? '+' : ''}{adj.delta}pt</div></div>
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
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1 }}>{availableTeams.usedCount}/68</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {availableTeams.usedTeams.map(t => <span key={t} className="badge badge-gray">{t}</span>)}
            {availableTeams.usedCount === 0 && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--green-text)' }}>NONE YET</span>}
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
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 6 }}>
        {game.gameDate ? new Date(game.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase() : 'DATE TBD'}
      </div>
      <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
        {game.isHome ? 'vs' : '@'} {game.opponent}
      </div>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, letterSpacing: 1, marginBottom: 8, color: isUpset ? 'var(--amber)' : 'var(--green-text)' }}>
        {isUpset ? '⚡ UPSET ELIGIBLE · 2PT IF THEY LOSE' : 'P4 VS P4 · 1PT WIN'}
      </div>
      {game.winProb != null && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: probColor(game.winProb), letterSpacing: 1 }}>WIN PROB {pct(game.winProb)}%</span>
            {isUpset && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--amber)', letterSpacing: 1 }}>UPSET {pct(1 - game.winProb)}%</span>}
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: 4, width: `${pct(game.winProb)}%`, background: probColor(game.winProb), borderRadius: 2 }} />
          </div>
        </div>
      )}
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, letterSpacing: 1,
        color: game.alreadyUsed ? '#e05c5c' : game.pickedThisWeek ? 'var(--amber)' : '#4ab870' }}>
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

  if (loading) return <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>LOADING {team.toUpperCase()}...</div>;
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
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 2 }}>{conference}</span>
            <span className={`badge ${usedByMe ? 'badge-red' : 'badge-green'}`}>{usedByMe ? 'USED BY YOU' : 'AVAILABLE TO PICK'}</span>
          </div>
        </div>
      </div>

      <div className="stat-strip" style={{ marginBottom: 20 }}>
        <div className="stat-cell"><div className="stat-number" style={{ color: '#4ab870' }}>{wins}</div><div className="stat-label">WINS</div></div>
        <div className="stat-cell"><div className="stat-number" style={{ color: '#e05c5c' }}>{losses}</div><div className="stat-label">LOSSES</div></div>
        <div className="stat-cell"><div className="stat-number">{schedule.length}</div><div className="stat-label">GAMES</div></div>
        <div className="stat-cell">
          <div className="stat-number" style={{ color: 'var(--amber)' }}>{Object.values(leagueByWeek).flat().length}</div>
          <div className="stat-label">LEAGUE PICKS</div>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--amber)', letterSpacing: 3, marginBottom: 12 }}>UPCOMING GAMES</div>
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
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 4 }}>
                      {g.weekLabel.toUpperCase()} · {g.gameDate ? new Date(g.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase() : 'TBD'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16 }}>
                      {g.isHome ? 'vs' : '@'} {g.opponent}
                    </div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: isUpset ? 'var(--amber)' : 'var(--green-text)', letterSpacing: 1, marginTop: 3 }}>
                      {isUpset ? '⚡ UPSET ELIGIBLE' : 'P4 VS P4'}
                      {g.winProb != null && <span style={{ marginLeft: 8, color: probColor(g.winProb) }}>WIN PROB {pct(g.winProb)}%</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    {leaguePicks.length > 0 && <>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--amber)' }}>{leaguePicks.length}</div>
                      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: 'var(--green-text)', letterSpacing: 1 }}>PICKED</div>
                    </>}
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, letterSpacing: 1, marginTop: 4,
                      color: g.alreadyUsed ? '#e05c5c' : g.pickedThisWeek ? 'var(--amber)' : '#4ab870' }}>
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
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 3, marginBottom: 12 }}>PAST RESULTS</div>
          {[...past].reverse().map(g => {
            const leaguePicks = leagueByWeek[g.week] || [];
            const anyCorrect = leaguePicks.some(p => p.result === 'correct');
            const allIncorrect = leaguePicks.length > 0 && leaguePicks.every(p => p.result === 'incorrect');
            return (
              <div key={g.week} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 6 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: g.won === true ? '#4ab870' : g.won === false ? '#e05c5c' : 'var(--amber)', width: 28, flexShrink: 0, textAlign: 'center' }}>
                  {g.won === true ? 'W' : g.won === false ? 'L' : 'T'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14 }}>{g.isHome ? 'vs' : '@'} {g.opponent}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginTop: 2 }}>
                    {g.weekLabel.toUpperCase()}
                    {g.teamScore != null && <span style={{ marginLeft: 8, color: 'var(--cream-dim)' }}>{g.teamScore}–{g.oppScore}</span>}
                  </div>
                </div>
                {leaguePicks.length > 0 && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: anyCorrect ? '#4ab870' : allIncorrect ? '#e05c5c' : 'var(--cream-dim)' }}>{leaguePicks.length}</div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: 'var(--green-text)', letterSpacing: 1 }}>PICKED</div>
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
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1, marginTop: 8 }}>NO TEAMS MATCH "{search.toUpperCase()}"</div>
        )}
      </div>
      {!search && (
        <>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 3, marginBottom: 16 }}>SELECT A TEAM TO VIEW SCHEDULE + PICK CONTEXT</div>
          {Object.entries(CONFERENCES).map(([conf, teams]) => (
            <div key={conf} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 3, color: 'var(--amber)', marginBottom: 10 }}>{conf}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                {teams.map(team => (
                  <button key={team} onClick={() => setSelectedTeam(team)}
                    style={{ textAlign: 'left', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, padding: '10px 12px', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--cream)', cursor: 'pointer', transition: 'border-color 0.15s' }}
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
const CELL_BORDER = { empty: 'rgba(255,255,255,0.05)', pending: 'rgba(245,166,35,0.35)', win: 'rgba(74,184,112,0.45)', upset: '#1a5c35', wrong: 'rgba(224,92,92,0.45)', mixed: 'rgba(74,184,112,0.25)' };

function MatrixTooltip({ entries, label, isScored, x, y }) {
  if (!entries || entries.length === 0) return null;
  const safeX = Math.min(x, window.innerWidth - 260);
  const safeY = Math.min(y, window.innerHeight - 40 - entries.length * 26);
  return (
    <div style={{ position: 'fixed', zIndex: 300, background: 'var(--card)', border: '1px solid var(--amber-dim)', borderRadius: 'var(--radius)', padding: '10px 14px', minWidth: 210, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', pointerEvents: 'none', left: safeX, top: safeY }}>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--amber)', letterSpacing: 2, marginBottom: 8 }}>{label}</div>
      {entries.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, color: e.result === 'correct' ? '#4ab870' : e.result === 'incorrect' ? '#e05c5c' : 'var(--cream)' }}>
            {e.displayName || e.team}
          </span>
          <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, letterSpacing: 1, color: e.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)', marginLeft: 10 }}>
            {e.pickType === 'upset_loss' ? '⚡' : ''}
            {isScored && e.result ? ` ${e.result === 'correct' ? `+${e.pointsEarned ?? '?'}pt` : '0pt'}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function PicksMatrix({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('teams');
  const [showAll, setShowAll] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    api.get('/picks/matrix').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>LOADING MATRIX...</div>;
  if (!data) return null;

  const { weeks, teamRows, playerRows, myId } = data;
  const FREEZE_W = 122;
  const CELL_W = 44;
  const CELL_H = 34;

  const showTip = (e, entries, label, isScored) => {
    if (!entries || entries.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ entries, label, isScored, x: rect.left + rect.width / 2, y: rect.bottom + 6 });
  };

  const renderTeamsView = () => {
    const rows = showAll ? teamRows : teamRows.slice(0, 20);
    return (
      <div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 10 }}>
          TEAMS × WEEKS · CELL = # PICKS · HOVER FOR DETAIL
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {[{ c: CELL_COLORS.win, b: CELL_BORDER.win, l: 'CORRECT WIN' }, { c: CELL_COLORS.upset, b: CELL_BORDER.upset, l: 'CORRECT UPSET' }, { c: CELL_COLORS.wrong, b: CELL_BORDER.wrong, l: 'INCORRECT' }, { c: CELL_COLORS.pending, b: CELL_BORDER.pending, l: 'PENDING' }].map(({ c, b, l }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 12, background: c, border: `1px solid ${b}`, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: 'var(--green-text)', letterSpacing: 1 }}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: FREEZE_W + weeks.length * CELL_W }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--bg)', width: FREEZE_W, minWidth: FREEZE_W, padding: '6px 10px', textAlign: 'left', fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>TEAM</th>
                {weeks.map(w => (
                  <th key={w.week} style={{ width: CELL_W, minWidth: CELL_W, padding: '4px 2px', textAlign: 'center', fontFamily: 'var(--font-scoreboard)', fontSize: 8, letterSpacing: 0.5, color: w.isScored ? '#4ab870' : w.isOpen ? 'var(--amber)' : 'var(--green-text)', borderBottom: '1px solid var(--border)' }}>{w.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.team}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'var(--bg)', padding: '4px 10px', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: FREEZE_W, borderRight: '1px solid var(--border)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{row.team}</td>
                  {weeks.map(w => {
                    const entries = row.byWeek[w.week] || [];
                    const state = cellState(entries, w.isScored);
                    return (
                      <td key={w.week}
                        onMouseEnter={e => showTip(e, entries, `${row.team} · ${w.label}`, w.isScored)}
                        onMouseLeave={() => setTooltip(null)}
                        style={{ width: CELL_W, height: CELL_H, textAlign: 'center', verticalAlign: 'middle', background: CELL_COLORS[state], border: `1px solid ${CELL_BORDER[state]}`, cursor: entries.length > 0 ? 'pointer' : 'default' }}>
                        {entries.length > 0 && <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: state === 'wrong' ? '#e05c5c' : state === 'pending' ? 'var(--amber)' : state === 'upset' ? '#7fd49a' : '#4ab870' }}>{entries.length}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {teamRows.length > 20 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(s => !s)} style={{ marginTop: 12, width: '100%', borderColor: 'var(--border)' }}>
            {showAll ? 'SHOW LESS ▲' : `SHOW ALL ${teamRows.length} TEAMS ▼`}
          </button>
        )}
      </div>
    );
  };

  const renderPlayersView = () => (
    <div>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 14 }}>PLAYERS × WEEKS · HOVER FOR PICKS DETAIL · R = RANDY'D</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: FREEZE_W + weeks.length * CELL_W }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--bg)', width: FREEZE_W, minWidth: FREEZE_W, padding: '6px 10px', textAlign: 'left', fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>PLAYER</th>
              {weeks.map(w => (
                <th key={w.week} style={{ width: CELL_W, minWidth: CELL_W, padding: '4px 2px', textAlign: 'center', fontFamily: 'var(--font-scoreboard)', fontSize: 8, letterSpacing: 0.5, color: w.isScored ? '#4ab870' : w.isOpen ? 'var(--amber)' : 'var(--green-text)', borderBottom: '1px solid var(--border)' }}>{w.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {playerRows.map(row => {
              const isMe = row.userId === myId?.toString();
              return (
                <tr key={row.userId}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'var(--bg)', padding: '4px 10px', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: FREEZE_W, borderRight: '1px solid var(--border)', borderBottom: '1px solid rgba(255,255,255,0.04)', color: isMe ? 'var(--amber)' : 'var(--cream)' }}>
                    {row.displayName}{isMe ? ' ◂' : ''}
                  </td>
                  {weeks.map(w => {
                    const wd = row.byWeek[w.week];
                    const picks = wd?.picks || [];
                    const tipEntries = picks.map(p => ({ displayName: p.team, pickType: p.pickType, result: p.result, pointsEarned: p.pointsEarned }));
                    const state = wd ? cellState(tipEntries.map(e => ({ ...e, displayName: row.displayName })), w.isScored) : 'empty';
                    return (
                      <td key={w.week}
                        onMouseEnter={e => showTip(e, tipEntries, `${row.displayName} · ${w.label}`, w.isScored)}
                        onMouseLeave={() => setTooltip(null)}
                        style={{ width: CELL_W, height: CELL_H, textAlign: 'center', verticalAlign: 'middle', background: CELL_COLORS[state], border: `1px solid ${CELL_BORDER[state]}`, cursor: wd ? 'pointer' : 'default', position: 'relative' }}>
                        {wd && <>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: state === 'wrong' ? '#e05c5c' : state === 'pending' ? 'var(--amber)' : state === 'upset' ? '#7fd49a' : '#4ab870' }}>
                            {w.isScored ? wd.totalPoints : '·'}
                          </span>
                          {wd.wasRandyd && <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 7, color: '#e05c5c', lineHeight: 1, marginTop: 1 }}>R</div>}
                        </>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ key: 'teams', label: '▦ TEAMS VIEW' }, { key: 'players', label: '▤ PLAYERS VIEW' }].map(({ key, label }) => (
          <button key={key} className={`btn btn-sm ${viewMode === key ? 'btn-outline' : 'btn-ghost'}`}
            style={{ borderColor: viewMode === key ? 'var(--amber)' : undefined, color: viewMode === key ? 'var(--amber)' : undefined }}
            onClick={() => setViewMode(key)}>{label}</button>
        ))}
      </div>
      {viewMode === 'teams' ? renderTeamsView() : renderPlayersView()}
      {tooltip && <MatrixTooltip {...tooltip} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPLORE PAGE SHELL
// ─────────────────────────────────────────────────────────────────────────────
export default function Explore() {
  const { user } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialTab = TABS.find(t => t.key === params.get('tab'))?.key || 'reveal';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [explorerTeam, setExplorerTeam] = useState(null);

  const handleViewTeam = (team) => {
    setExplorerTeam(team);
    setActiveTab('explorer');
  };

  return (
    <div>
      <div className="page-header" style={{ paddingBottom: 0 }}>
        <h1 className="page-title">EXPLORE</h1>
        <div className="page-subtitle">2026 SEASON · YOUR STATS & LEAGUE</div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, marginTop: 16, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flexShrink: 0, padding: '10px 12px', border: 'none', cursor: 'pointer', background: 'transparent',
            borderBottom: `2px solid ${activeTab === tab.key ? 'var(--amber)' : 'transparent'}`,
            color: activeTab === tab.key ? 'var(--amber)' : 'var(--green-text)',
            fontFamily: 'var(--font-scoreboard)', fontSize: 9, letterSpacing: 1.5,
            transition: 'color 0.15s, border-color 0.15s', whiteSpace: 'nowrap',
          }}>
            <span style={{ marginRight: 4 }}>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'reveal'   && <ThisWeek user={user} />}
      {activeTab === 'teams'    && <MyTeams user={user} onViewTeam={handleViewTeam} />}
      {activeTab === 'history'  && <MyPickHistory user={user} />}
      {activeTab === 'explorer' && <TeamExplorer user={user} initialTeam={explorerTeam} />}
      {activeTab === 'matrix'   && <PicksMatrix user={user} />}
    </div>
  );
}
