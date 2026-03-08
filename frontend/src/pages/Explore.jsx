import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// TAB DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'reveal',  label: 'THIS WEEK',      icon: '◐' },
  { key: 'teams',   label: 'MY TEAMS',       icon: '⊞' },
  { key: 'history', label: 'MY PICK HISTORY', icon: '◷' },
];

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
    <div className="score-card">
      <div className="empty-state">
        <span className="empty-icon">📋</span>
        <p>NO WEEKS AVAILABLE YET — CHECK BACK ONCE THE SEASON STARTS</p>
      </div>
    </div>
  );

  const { reveal = [], weekConfig, mostPicked = [] } = data || {};
  const isScored = weekConfig?.isScored;
  const weekLabel = (w) => w === 1 ? 'Week 0/1' : `Week ${w}`;

  const sorted = [...reveal].sort((a, b) =>
    isScored ? b.totalPoints - a.totalPoints : a.displayName.localeCompare(b.displayName)
  );

  const teamPickMap = {};
  for (const s of reveal) {
    for (const p of s.picks) {
      if (!teamPickMap[p.team]) teamPickMap[p.team] = [];
      teamPickMap[p.team].push({ player: s.displayName, pickType: p.pickType, result: p.result });
    }
  }

  return (
    <div>
      {/* Week tabs */}
      {weeks.length > 0 && (
        <div className="week-tabs" style={{ marginBottom: 20 }}>
          {weeks.map(w => (
            <button
              key={w.week}
              className={`week-tab ${selectedWeek === w.week ? 'active' : ''} ${w.isScored ? 'scored' : 'open'}`}
              onClick={() => { setSelectedWeek(w.week); setExpandedPlayer(null); }}
            >
              {w.week === 1 ? 'WK 0/1' : `WK ${w.week}`}
            </button>
          ))}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {loading && !data && (
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>
          LOADING PICKS...
        </div>
      )}

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

          {/* Most picked */}
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
          {sorted.map((s, i) => {
            const isMe = s.userId?.toString() === user?._id?.toString();
            const isExpanded = expandedPlayer === s.userId;
            return (
              <div key={s.userId} style={{
                background: 'var(--card)',
                border: `1px solid ${isMe ? 'var(--amber-dim)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)', marginBottom: 8, overflow: 'hidden',
              }}>
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
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MY TEAMS (TeamsRemaining)
// ─────────────────────────────────────────────────────────────────────────────
const CONFERENCES = {
  'SEC': ['Alabama', 'Arkansas', 'Auburn', 'Florida', 'Georgia', 'Kentucky', 'LSU', 'Mississippi State', 'Missouri', 'Ole Miss', 'South Carolina', 'Tennessee', 'Texas A&M', 'Vanderbilt', 'Texas', 'Oklahoma'],
  'Big Ten': ['Illinois', 'Indiana', 'Iowa', 'Maryland', 'Michigan', 'Michigan State', 'Minnesota', 'Nebraska', 'Northwestern', 'Ohio State', 'Penn State', 'Purdue', 'Rutgers', 'Wisconsin', 'UCLA', 'USC', 'Oregon', 'Washington'],
  'Big 12': ['Arizona', 'Arizona State', 'Baylor', 'BYU', 'Cincinnati', 'Colorado', 'Houston', 'Iowa State', 'Kansas', 'Kansas State', 'Oklahoma State', 'TCU', 'Texas Tech', 'UCF', 'Utah', 'West Virginia'],
  'ACC': ['Boston College', 'California', 'Clemson', 'Duke', 'Florida State', 'Georgia Tech', 'Louisville', 'Miami', 'NC State', 'North Carolina', 'Pittsburgh', 'SMU', 'Stanford', 'Syracuse', 'Virginia', 'Virginia Tech', 'Wake Forest'],
  'Ind': ['Notre Dame'],
};

function MyTeams({ user }) {
  const [filter, setFilter] = useState('all');
  const usedSet = new Set(user?.usedTeams || []);
  const total = 68;
  const used = usedSet.size;
  const remaining = total - used;

  return (
    <div>
      <div className="stat-strip" style={{ marginBottom: 16 }}>
        <div className="stat-cell">
          <div className="stat-number" style={{ color: '#4ab870' }}>{remaining}</div>
          <div className="stat-label">AVAILABLE</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number dim">{used}</div>
          <div className="stat-label">USED</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number">{total}</div>
          <div className="stat-label">TOTAL</div>
        </div>
      </div>

      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, marginBottom: 20 }}>
        <div style={{
          height: 8, borderRadius: 4,
          width: `${(used / total) * 100}%`,
          background: used > 50 ? '#e05c5c' : used > 30 ? 'var(--amber)' : 'var(--amber-dim)',
          transition: 'width 0.5s',
        }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'all', label: 'ALL TEAMS' },
          { key: 'available', label: `AVAILABLE (${remaining})` },
          { key: 'used', label: `USED (${used})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`btn btn-sm ${filter === key ? 'btn-outline' : 'btn-ghost'}`}
            style={{ borderColor: filter === key ? 'var(--amber)' : undefined, color: filter === key ? 'var(--amber)' : undefined }}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {Object.entries(CONFERENCES).map(([conf, teams]) => {
        const filtered = teams.filter(t => {
          if (filter === 'available') return !usedSet.has(t);
          if (filter === 'used') return usedSet.has(t);
          return true;
        });
        if (filtered.length === 0) return null;
        const confUsed = teams.filter(t => usedSet.has(t)).length;
        return (
          <div key={conf} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 3, color: 'var(--amber)' }}>{conf}</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1 }}>
                {teams.length - confUsed}/{teams.length} LEFT
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
              {filtered.map(team => {
                const isUsed = usedSet.has(team);
                return (
                  <div key={team} style={{
                    padding: '10px 12px',
                    background: isUsed ? 'var(--green-deep)' : 'var(--elevated)',
                    border: `1px solid ${isUsed ? 'var(--border)' : 'var(--amber-dim)'}`,
                    borderRadius: 'var(--radius)',
                    opacity: isUsed ? 0.45 : 1,
                  }}>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, color: isUsed ? 'var(--cream-dim)' : 'var(--cream)' }}>
                      {team}
                    </div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: isUsed ? 'var(--red-score)' : '#4ab870', letterSpacing: 1, marginTop: 2 }}>
                      {isUsed ? 'USED' : 'AVAILABLE'}
                    </div>
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
// MY PICK HISTORY (MyHistory)
// ─────────────────────────────────────────────────────────────────────────────
function MyPickHistory({ user }) {
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

  if (loading) return (
    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 2, padding: 20, textAlign: 'center' }}>
      LOADING...
    </div>
  );

  const totalPoints = history.reduce((s, w) => s + (w.totalPoints || 0), 0);
  const scored = history.filter(w => w.isScored);
  const bestWeek = scored.length ? scored.reduce((b, w) => w.totalPoints > b.totalPoints ? w : b) : null;
  const selectedData = history.find(h => h.week === selectedWeek);

  if (history.length === 0) return (
    <div className="score-card">
      <div className="empty-state">
        <span className="empty-icon">📋</span>
        <p>NO PICKS SUBMITTED YET</p>
        <Link to="/picks" className="btn btn-primary" style={{ marginTop: 16 }}>SUBMIT FIRST PICKS →</Link>
      </div>
    </div>
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
          <button
            key={w.week}
            className={`week-tab ${selectedWeek === w.week ? 'active' : ''} ${w.isScored ? 'scored' : ''}`}
            onClick={() => setSelectedWeek(w.week)}
          >
            WK {w.week === 1 ? '0/1' : w.week}
            {w.isScored && <span style={{ display: 'block', fontSize: 9, marginTop: 1 }}>{w.totalPoints}PT</span>}
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
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1, marginTop: 3 }}>
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
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: pick.result === 'correct' ? '#4ab870' : 'var(--red-score)' }}>{pick.pointsEarned}pt</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: pick.result === 'correct' ? '#4ab870' : 'var(--red-score)', letterSpacing: 1 }}>{pick.result?.toUpperCase()}</div>
                </div>
              ) : (
                <span className="badge badge-gray">PENDING</span>
              )}
            </div>
          ))}

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
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: adj.delta >= 0 ? '#4ab870' : '#e05c5c' }}>
                      {adj.delta >= 0 ? '+' : ''}{adj.delta}pt
                    </div>
                  </div>
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
            {availableTeams.usedTeams.map(t => (
              <span key={t} className="badge badge-gray">{t}</span>
            ))}
            {availableTeams.usedCount === 0 && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--green-text)' }}>NONE YET</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPLORE PAGE SHELL
// ─────────────────────────────────────────────────────────────────────────────
export default function Explore() {
  const { user } = useAuth();
  const location = useLocation();

  // Allow deep-linking: /explore?tab=teams etc.
  const params = new URLSearchParams(location.search);
  const initialTab = TABS.find(t => t.key === params.get('tab'))?.key || 'reveal';
  const [activeTab, setActiveTab] = useState(initialTab);

  const active = TABS.find(t => t.key === activeTab);

  return (
    <div>
      <div className="page-header" style={{ paddingBottom: 0 }}>
        <h1 className="page-title">EXPLORE</h1>
        <div className="page-subtitle">2026 SEASON · YOUR STATS & LEAGUE</div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 24, marginTop: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
              background: 'transparent',
              borderBottom: `2px solid ${activeTab === tab.key ? 'var(--amber)' : 'transparent'}`,
              color: activeTab === tab.key ? 'var(--amber)' : 'var(--green-text)',
              fontFamily: 'var(--font-scoreboard)',
              fontSize: 10, letterSpacing: 1.5,
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            <span style={{ marginRight: 5 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'reveal'  && <ThisWeek user={user} />}
      {activeTab === 'teams'   && <MyTeams user={user} />}
      {activeTab === 'history' && <MyPickHistory user={user} />}
    </div>
  );
}
