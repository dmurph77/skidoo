import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ── Helpers ────────────────────────────────────────────────────────────────────
function pct(prob) {
  if (prob == null) return null;
  return Math.round(prob * 100);
}

function probColor(prob) {
  if (prob == null) return 'var(--green-text)';
  if (prob >= 0.70) return '#4ab870';
  if (prob >= 0.50) return 'var(--cream-dim)';
  if (prob >= 0.35) return 'var(--amber)';
  return '#e05c5c';
}

function ProbBar({ prob, label, pts, isUpset }) {
  const p = pct(prob);
  if (p == null) return null;
  const ev = prob * pts;
  const color = isUpset ? 'var(--amber)' : probColor(prob);
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color, letterSpacing: 1 }}>
          {label} {p}%
        </span>
        <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>
          EV: {ev.toFixed(2)}pt
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ height: 3, width: `${p}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ picks, weekLabel, onConfirm, onCancel, loading }) {
  const totalEV = picks.reduce((sum, p) => {
    if (p.prob == null) return sum + (p.pickType === 'upset_loss' ? 2 : 1);
    return sum + (p.prob * (p.pickType === 'upset_loss' ? 2 : 1));
  }, 0);
  const maxPts = picks.reduce((s, p) => s + (p.pickType === 'upset_loss' ? 2 : 1), 0);
  const hasProbData = picks.some(p => p.prob != null);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title">CONFIRM PICKS</div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 16 }}>
          {weekLabel.toUpperCase()} · REVIEW BEFORE LOCKING IN
        </div>

        {picks.map((p, i) => (
          <div key={i} className="pick-slot pending" style={{ marginBottom: 8 }}>
            <div className="pick-num">{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div className="pick-team-name">{p.team}</div>
              <div className="pick-type-tag" style={{ color: p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)' }}>
                {p.pickType === 'win_vs_power4'
                  ? `WIN VS ${p.opponent || 'OPPONENT'} · 1PT`
                  : `UPSET LOSS TO ${p.opponent || 'OPPONENT'} · 2PTS`}
              </div>
              {p.prob != null && (
                <ProbBar
                  prob={p.prob}
                  label={p.pickType === 'upset_loss' ? 'UPSET PROB' : 'WIN PROB'}
                  pts={p.pickType === 'upset_loss' ? 2 : 1}
                  isUpset={p.pickType === 'upset_loss'}
                />
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--cream-dim)', flexShrink: 0 }}>
              {p.pickType === 'upset_loss' ? '2PT' : '1PT'}
            </div>
          </div>
        ))}

        {/* Expected value summary */}
        <div style={{
          background: 'var(--elevated)', border: '1px solid var(--border)',
          padding: '14px 16px', borderRadius: 'var(--radius)', margin: '16px 0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 2 }}>MAX POSSIBLE</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--cream)', lineHeight: 1 }}>{maxPts}<span style={{ fontSize: 12, color: 'var(--green-text)' }}>pts</span></div>
            </div>
            {hasProbData && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 2 }}>EXPECTED VALUE</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--amber)', lineHeight: 1 }}>{totalEV.toFixed(2)}<span style={{ fontSize: 12, color: 'var(--green-text)' }}>pts</span></div>
              </div>
            )}
          </div>
          {hasProbData && (
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginTop: 8 }}>
              EV = SUM OF (PICK PTS × WIN PROBABILITY) — BASED ON CFBD PRE-GAME ODDS
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading} style={{ flex: 1 }}>← EDIT</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading} style={{ flex: 2 }}>
            {loading ? 'SUBMITTING...' : 'LOCK IN PICKS →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Game Tile ──────────────────────────────────────────────────────────────────
function GameTile({ game, pickedTeam, pickedType, onPick, isLocked }) {
  const isUpsetGame = game.matchupType !== 'p4_vs_p4';

  const renderTeam = (team, isP4, isUsed, winProb, opponent, canWin, canUpset) => {
    if (!isP4) {
      return (
        <div style={{ flex: 1, padding: '10px 12px', textAlign: 'center', background: 'var(--green-deep)', borderRadius: 'var(--radius)', opacity: 0.4 }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14 }}>{team}</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>NON-P4</div>
        </div>
      );
    }

    const isPickedWin   = pickedTeam === team && pickedType === 'win_vs_power4';
    const isPickedUpset = pickedTeam === team && pickedType === 'upset_loss';
    const isAnyPicked   = isPickedWin || isPickedUpset;

    // For upset picks, probability is the LOSS probability (1 - winProb)
    const upsetProb = winProb != null ? 1 - winProb : null;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Team name card */}
        <div style={{
          padding: '10px 12px', textAlign: 'center',
          background: isAnyPicked ? 'rgba(245,166,35,0.08)' : 'var(--elevated)',
          borderRadius: 'var(--radius)',
          border: `1px solid ${isAnyPicked ? 'var(--amber-dim)' : 'var(--border)'}`,
        }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15, marginBottom: winProb != null ? 4 : 0 }}>{team}</div>

          {/* Win probability bar */}
          {canWin && winProb != null && (
            <div style={{ marginTop: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: probColor(winProb), letterSpacing: 0.5 }}>
                  WIN {pct(winProb)}%
                </span>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: 'var(--green-text)' }}>
                  EV {winProb.toFixed(2)}pt
                </span>
              </div>
              <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                <div style={{ height: 2, width: `${pct(winProb)}%`, background: probColor(winProb), borderRadius: 1 }} />
              </div>
            </div>
          )}

          {/* Upset probability bar (loss prob) */}
          {canUpset && upsetProb != null && (
            <div style={{ marginTop: canWin ? 6 : 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: 'var(--amber)', letterSpacing: 0.5 }}>
                  ⚡ UPSET {pct(upsetProb)}%
                </span>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: 'var(--green-text)' }}>
                  EV {(upsetProb * 2).toFixed(2)}pt
                </span>
              </div>
              <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                <div style={{ height: 2, width: `${pct(upsetProb)}%`, background: 'var(--amber)', borderRadius: 1 }} />
              </div>
            </div>
          )}
        </div>

        {/* Pick buttons */}
        {!isLocked && (
          <div style={{ display: 'flex', gap: 3 }}>
            {canWin && (
              <button
                onClick={() => onPick(team, 'win_vs_power4', opponent, winProb)}
                className="btn btn-sm"
                style={{
                  flex: 1, fontSize: 10, letterSpacing: 0.5, padding: '5px 4px',
                  background: isPickedWin ? 'rgba(245,166,35,0.15)' : 'transparent',
                  border: `1px solid ${isPickedWin ? 'var(--amber)' : 'var(--border)'}`,
                  color: isPickedWin ? 'var(--amber)' : 'var(--cream-dim)',
                }}
              >
                {isPickedWin ? '✓ WIN' : 'WIN · 1PT'}
              </button>
            )}
            {canUpset && (
              <button
                onClick={() => onPick(team, 'upset_loss', opponent, upsetProb)}
                className="btn btn-sm"
                style={{
                  flex: 1, fontSize: 10, letterSpacing: 0.5, padding: '5px 4px',
                  background: isPickedUpset ? 'var(--amber)' : 'rgba(245,166,35,0.06)',
                  border: `1px solid ${isPickedUpset ? 'var(--amber)' : 'var(--amber-dim)'}`,
                  color: isPickedUpset ? 'var(--green-deep)' : 'var(--amber)',
                  fontWeight: isPickedUpset ? 700 : 400,
                }}
              >
                {isPickedUpset ? '✓ UPSET' : 'UPSET · 2PT'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const homeIsP4 = game.homeIsPower4;
  const awayIsP4 = game.awayIsPower4;
  const homeCanWin   = homeIsP4 && awayIsP4;
  const homeCanUpset = homeIsP4 && !awayIsP4;
  const awayCanWin   = awayIsP4 && homeIsP4;
  const awayCanUpset = awayIsP4 && !homeIsP4;
  const isSelected = pickedTeam === game.homeTeam || pickedTeam === game.awayTeam;

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${isSelected ? 'var(--amber-dim)' : isUpsetGame ? 'rgba(245,166,35,0.2)' : 'var(--border)'}`,
      borderLeft: isUpsetGame ? '3px solid var(--amber-dim)' : undefined,
      borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 8,
      position: 'relative',
    }}>
      {isUpsetGame && (
        <div style={{ position: 'absolute', top: 6, right: 8, fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--amber)', letterSpacing: 2 }}>
          ⚡ UPSET ELIGIBLE
        </div>
      )}
      {game.gameDate && (
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginBottom: 8 }}>
          {new Date(game.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {renderTeam(game.homeTeam, homeIsP4, game.homeUsed, game.homeWinProb, game.awayTeam, homeCanWin, homeCanUpset)}
        <div style={{ flexShrink: 0, fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--green-text)', alignSelf: 'center', paddingTop: 4 }}>VS</div>
        {renderTeam(game.awayTeam, awayIsP4, game.awayUsed, game.awayWinProb, game.homeTeam, awayCanWin, awayCanUpset)}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SubmitPicks() {
  const { week: weekParam } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [weekConfig, setWeekConfig] = useState(null);
  const [games, setGames] = useState([]);
  const [existingSubmission, setExistingSubmission] = useState(null);
  // picks: [{ team, pickType, opponent, prob }]
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetWeek, setTargetWeek] = useState(weekParam ? parseInt(weekParam) : null);
  const [totalAvailable, setTotalAvailable] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const weeksRes = await api.get('/picks/weeks');
        const allWeeks = weeksRes.data.weeks || [];

        let week = targetWeek;
        if (!week) {
          const open = allWeeks.find(w => w.isOpen);
          week = open?.week || allWeeks[allWeeks.length - 1]?.week || 1;
          setTargetWeek(week);
        }

        const [configRes, gamesRes] = await Promise.all([
          api.get(`/picks/week/${week}`),
          api.get(`/picks/week/${week}/games`),
        ]);

        setWeekConfig(configRes.data.weekConfig);
        setExistingSubmission(configRes.data.submission);
        setGames(gamesRes.data.games || []);
        setTotalAvailable(gamesRes.data.totalAvailable || 0);

        if (configRes.data.submission?.picks?.length > 0) {
          setPicks(configRes.data.submission.picks.map(p => ({
            team: p.team, pickType: p.pickType, opponent: '', prob: null
          })));
        } else {
          setPicks([]);
        }
      } catch (err) {
        setError('Failed to load week data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [targetWeek]);

  const handlePick = (team, pickType, opponent, prob) => {
    if (!weekConfig?.isOpen) return;
    if (weekConfig?.deadline && new Date() > new Date(weekConfig.deadline)) return;
    if (existingSubmission?.isLocked) return;

    setPicks(prev => {
      const existingIdx = prev.findIndex(p => p.team === team);
      // Toggle off if same team+type
      if (existingIdx >= 0 && prev[existingIdx].pickType === pickType) {
        return prev.filter((_, i) => i !== existingIdx);
      }
      // Update if same team different type
      if (existingIdx >= 0) {
        return prev.map((p, i) => i === existingIdx ? { team, pickType, opponent, prob } : p);
      }
      // Add new
      return [...prev, { team, pickType, opponent, prob }];
    });
  };

  const removePick = (idx) => setPicks(prev => prev.filter((_, i) => i !== idx));

  const picksRequired = targetWeek <= 2 ? 4 : 5;
  const isPastDeadline = weekConfig?.deadline && new Date() > new Date(weekConfig.deadline);
  const canEdit = weekConfig?.isOpen && !isPastDeadline && !existingSubmission?.isLocked;
  const canSubmit = picks.length === picksRequired && canEdit;

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      await api.post(`/picks/week/${targetWeek}`, {
        picks: picks.map(p => ({ team: p.team, pickType: p.pickType }))
      });
      setSuccess('PICKS SUBMITTED!');
      setShowConfirm(false);
      const res = await api.get(`/picks/week/${targetWeek}`);
      setExistingSubmission(res.data.submission);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit picks');
      setShowConfirm(false);
    } finally { setSaving(false); }
  };

  const weekLabel = targetWeek === 1 ? 'Week 0/1' : `Week ${targetWeek}`;
  const pickedTeamSet = new Set(picks.map(p => p.team));
  const upsetGames = games.filter(g => g.matchupType !== 'p4_vs_p4');
  const p4Games    = games.filter(g => g.matchupType === 'p4_vs_p4');

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING WEEK...</div>
    </div>
  );

  return (
    <div>
      {showConfirm && (
        <ConfirmModal
          picks={picks}
          weekLabel={weekLabel}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
          loading={saving}
        />
      )}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>← BACK</button>
            {weekConfig?.isOpen && !isPastDeadline && <span className="badge badge-amber">OPEN</span>}
            {existingSubmission?.isLocked    && <span className="badge badge-gray">LOCKED</span>}
            {existingSubmission?.wasRandyd   && <span className="badge badge-red">RANDY'D</span>}
          </div>
          <h1 className="page-title">{weekLabel.toUpperCase()} PICKS</h1>
          <div className="page-subtitle">
            {weekConfig?.deadline
              ? `DEADLINE: ${new Date(weekConfig.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}`
              : 'THURSDAY NOON'}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--amber)', lineHeight: 1 }}>
            {user?.usedTeams?.length || 0}<span style={{ fontSize: 16, color: 'var(--green-text)' }}>/68</span>
          </div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2 }}>TEAMS USED</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1, marginTop: 3 }}>
            {totalAvailable} GAMES AVAILABLE
          </div>
        </div>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Scoring legend */}
      <div className="score-card" style={{ marginBottom: 14, padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="badge badge-cream">WIN VS P4</span>
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--cream-dim)' }}>Beat a P4 team · <strong style={{ color: 'var(--cream)' }}>1 PT</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="badge badge-amber">⚡ UPSET</span>
            <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--cream-dim)' }}>Lose to a non-P4 · <strong style={{ color: 'var(--amber)' }}>2 PTS</strong></span>
          </div>
        </div>
      </div>

      {/* Pick tracker strip */}
      {canEdit && (
        <div className="score-card" style={{ marginBottom: 14, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: picks.length > 0 ? 10 : 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2 }}>
              YOUR PICKS &nbsp;
              <span style={{ color: picks.length === picksRequired ? '#4ab870' : 'var(--amber)' }}>
                {picks.length}/{picksRequired}
              </span>
            </div>
            {canSubmit && (
              <button className="btn btn-primary btn-sm" onClick={() => { setError(''); setShowConfirm(true); }}>
                REVIEW →
              </button>
            )}
          </div>
          {picks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {picks.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: p.pickType === 'upset_loss' ? 'rgba(245,166,35,0.1)' : 'var(--elevated)',
                  border: `1px solid ${p.pickType === 'upset_loss' ? 'var(--amber-dim)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', padding: '5px 10px',
                }}>
                  <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13 }}>{p.team}</span>
                  <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)', letterSpacing: 1 }}>
                    {p.pickType === 'upset_loss' ? '⚡2PT' : '1PT'}
                  </span>
                  {p.prob != null && (
                    <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)' }}>
                      {pct(p.prob)}%
                    </span>
                  )}
                  <button onClick={() => removePick(i)} style={{ background: 'none', border: 'none', color: 'var(--green-text)', cursor: 'pointer', fontSize: 11, padding: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scored view */}
      {existingSubmission?.isScored && (
        <div className="score-card gold" style={{ marginBottom: 16, textAlign: 'center', padding: '20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, color: 'var(--amber)', lineHeight: 1 }}>{existingSubmission.totalPoints}</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 3, marginTop: 4 }}>POINTS THIS WEEK</div>
          <div style={{ marginTop: 16 }}>
            {existingSubmission.picks.map((pick, i) => (
              <div key={i} className={`pick-slot ${pick.result || 'pending'}`} style={{ marginBottom: 6, textAlign: 'left' }}>
                <div className="pick-num">{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div className="pick-team-name">{pick.team}</div>
                  <div className="pick-type-tag">{pick.pickType === 'win_vs_power4' ? 'WIN VS P4 · 1PT' : 'UPSET LOSS · 2PTS'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: pick.result === 'correct' ? '#4ab870' : 'var(--red-score)' }}>{pick.pointsEarned}pt</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: pick.result === 'correct' ? '#4ab870' : 'var(--red-score)', letterSpacing: 1 }}>{pick.result?.toUpperCase()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status alerts */}
      {!weekConfig && <div className="alert alert-warning">THIS WEEK HAS NOT BEEN CONFIGURED YET.</div>}
      {weekConfig && !weekConfig.isOpen && !existingSubmission && <div className="alert alert-info">PICKS ARE NOT YET OPEN FOR THIS WEEK.</div>}
      {isPastDeadline && !existingSubmission?.isLocked && <div className="alert alert-warning">DEADLINE HAS PASSED.</div>}
      {games.length === 0 && weekConfig?.isOpen && <div className="alert alert-info">NO AVAILABLE GAMES — YOU MAY HAVE USED ALL TEAMS PLAYING THIS WEEK.</div>}

      {/* Game tiles */}
      {canEdit && games.length > 0 && (
        <>
          {upsetGames.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--amber)', letterSpacing: 3, marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>⚡ UPSET ELIGIBLE</span>
                <span style={{ color: 'var(--green-text)' }}>P4 TEAM PLAYS NON-P4 · 2 PTS IF THEY LOSE</span>
              </div>
              {upsetGames.map((g, i) => (
                <GameTile key={g._id || i} game={g}
                  pickedTeam={pickedTeamSet.has(g.homeTeam) ? g.homeTeam : pickedTeamSet.has(g.awayTeam) ? g.awayTeam : null}
                  pickedType={picks.find(p => p.team === g.homeTeam || p.team === g.awayTeam)?.pickType}
                  onPick={handlePick} isLocked={!canEdit}
                />
              ))}
            </div>
          )}
          {p4Games.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 3, marginBottom: 10 }}>
                P4 VS P4 — 1 PT FOR WIN
              </div>
              {p4Games.map((g, i) => (
                <GameTile key={g._id || i} game={g}
                  pickedTeam={pickedTeamSet.has(g.homeTeam) ? g.homeTeam : pickedTeamSet.has(g.awayTeam) ? g.awayTeam : null}
                  pickedType={picks.find(p => p.team === g.homeTeam || p.team === g.awayTeam)?.pickType}
                  onPick={handlePick} isLocked={!canEdit}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Bottom CTA */}
      {canSubmit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingBottom: 40 }}>
          <button className="btn btn-primary btn-lg" onClick={() => { setError(''); setShowConfirm(true); }}>
            {existingSubmission ? 'UPDATE PICKS →' : 'REVIEW & SUBMIT →'}
          </button>
        </div>
      )}
    </div>
  );
}
