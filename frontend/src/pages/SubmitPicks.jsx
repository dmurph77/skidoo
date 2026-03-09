import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ── Celebration Overlay ────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#f5a623','#ffbe4d','#4ab870','#f0e6c8','#c4821a','#8bb89a','#d64c2a'];
function CelebrationOverlay({ picks, weekLabel, onDismiss }) {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.8}s`,
    duration: `${1.8 + Math.random() * 1.2}s`,
    rotate: `${Math.random() * 360}deg`,
    width: `${6 + Math.random() * 8}px`,
    height: `${10 + Math.random() * 10}px`,
  }));

  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const maxPts = picks.reduce((s, p) => s + (p.pickType === 'upset_loss' ? 2 : 1), 0);

  return (
    <div className="celebration-overlay" style={{ background: 'rgba(0,0,0,0.82)', pointerEvents: 'all' }}>
      <div className="celebration-burst">
        {pieces.map(p => (
          <div key={p.id} className="confetti-piece" style={{
            background: p.color, left: p.left, top: '-10%',
            width: p.width, height: p.height,
            animationDelay: p.delay, animationDuration: p.duration,
            transform: `rotate(${p.rotate})`,
          }} />
        ))}
      </div>
      <div className="celebration-card">
        <div className="celebration-title">LOCKED IN!</div>
        <div className="celebration-subtitle">{weekLabel.toUpperCase()} · {picks.length} PICKS · UP TO {maxPts} PTS</div>
        <div className="celebration-picks">
          {picks.map((p, i) => (
            <div key={i} className="celebration-pick-row" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
              <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15 }}>{p.team}</span>
              <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)', letterSpacing: 1 }}>
                {p.pickType === 'upset_loss' ? '⚡ UPSET · 2PT' : 'WIN · 1PT'}
              </span>
            </div>
          ))}
        </div>
        <button className="celebration-dismiss" onClick={onDismiss}>TAP TO DISMISS</button>
      </div>
    </div>
  );
}

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

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ picks, weekLabel, onConfirm, onCancel, loading, usedTeams = new Set() }) {
  const totalEV = picks.reduce((sum, p) => {
    const pts = p.pickType === 'upset_loss' ? 2 : 1;
    return sum + (p.prob != null ? p.prob * pts : pts);
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
              <div className="pick-team-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.team}
                {usedTeams.has(p.team) && (
                  <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: '#e05c5c', letterSpacing: 1 }}>⚠ USED TEAM</span>
                )}
              </div>
              <div className="pick-type-tag" style={{ color: p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)' }}>
                {p.pickType === 'win_vs_power4' ? `WIN VS ${p.opponent || 'OPPONENT'} · 1PT` : `UPSET LOSS TO ${p.opponent || 'OPPONENT'} · 2PTS`}
              </div>
              {p.prob != null && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: p.pickType === 'upset_loss' ? 'var(--amber)' : probColor(p.prob), letterSpacing: 1 }}>
                      {p.pickType === 'upset_loss' ? 'UPSET PROB' : 'WIN PROB'} {pct(p.prob)}%
                    </span>
                    <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)' }}>
                      EV: {(p.prob * (p.pickType === 'upset_loss' ? 2 : 1)).toFixed(2)}pt
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{ height: 3, width: `${pct(p.prob)}%`, background: p.pickType === 'upset_loss' ? 'var(--amber)' : probColor(p.prob), borderRadius: 2 }} />
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: p.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--cream-dim)', flexShrink: 0 }}>
              {p.pickType === 'upset_loss' ? '2PT' : '1PT'}
            </div>
          </div>
        ))}
        <div style={{ background: 'var(--elevated)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: 'var(--radius)', margin: '16px 0' }}>
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
              EV = PICK PTS × WIN PROBABILITY (CFBD PRE-GAME ODDS)
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

// ── Team Search Bar ────────────────────────────────────────────────────────────
function TeamSearch({ allGames, picks, onPick, usedTeams }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build flat list of pickable teams from games
  const options = [];
  for (const g of allGames) {
    if (g.homeIsPower4 && !usedTeams.has(g.homeTeam)) {
      const canWin = g.matchupType === 'p4_vs_p4';
      const canUpset = g.matchupType === 'p4_vs_nonp4';
      const upsetProb = g.homeWinProb != null ? 1 - g.homeWinProb : null;
      if (canWin) options.push({ team: g.homeTeam, pickType: 'win_vs_power4', opponent: g.awayTeam, prob: g.homeWinProb, label: `WIN vs ${g.awayTeam}`, pts: 1, thursdayLocked: g.thursdayLocked });
      if (canUpset) options.push({ team: g.homeTeam, pickType: 'upset_loss', opponent: g.awayTeam, prob: upsetProb, label: `UPSET LOSS vs ${g.awayTeam}`, pts: 2, thursdayLocked: g.thursdayLocked });
    }
    if (g.awayIsPower4 && !usedTeams.has(g.awayTeam)) {
      const canWin = g.matchupType === 'p4_vs_p4';
      const canUpset = g.matchupType === 'nonp4_vs_p4';
      const upsetProb = g.awayWinProb != null ? 1 - g.awayWinProb : null;
      if (canWin) options.push({ team: g.awayTeam, pickType: 'win_vs_power4', opponent: g.homeTeam, prob: g.awayWinProb, label: `WIN vs ${g.homeTeam}`, pts: 1 });
      if (canUpset) options.push({ team: g.awayTeam, pickType: 'upset_loss', opponent: g.homeTeam, prob: upsetProb, label: `UPSET LOSS vs ${g.homeTeam}`, pts: 2 });
    }
  }

  const pickedKeys = new Set(picks.map(p => `${p.team}|${p.pickType}`));
  const filtered = options.filter(o =>
    !o.thursdayLocked &&
    (!query || o.team.toLowerCase().includes(query.toLowerCase()) || o.opponent.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 16 }}>
      <input
        className="form-input"
        placeholder="SEARCH TEAMS — TYPE TO FILTER..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={{ fontFamily: 'var(--font-scoreboard)', letterSpacing: 1 }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--elevated)', border: '1px solid var(--amber-dim)',
          borderRadius: 'var(--radius)', maxHeight: 280, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {filtered.map((o, i) => {
            const isPicked = pickedKeys.has(`${o.team}|${o.pickType}`);
            return (
              <div
                key={i}
                onClick={() => { onPick(o.team, o.pickType, o.opponent, o.prob); setQuery(''); setOpen(false); }}
                style={{
                  padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: isPicked ? 'rgba(245,166,35,0.1)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,166,35,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = isPicked ? 'rgba(245,166,35,0.1)' : 'transparent'}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15, color: isPicked ? 'var(--amber)' : 'var(--cream)' }}>
                    {isPicked ? '✓ ' : ''}{o.team}
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: o.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)', letterSpacing: 1 }}>
                    {o.label} · {o.pts}PT{o.prob != null ? ` · EV ${(o.prob * o.pts).toFixed(2)}` : ''}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: o.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--cream-dim)' }}>
                  {o.pts}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {open && filtered.length === 0 && query && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1 }}>NO AVAILABLE TEAMS MATCH "{query.toUpperCase()}"</div>
        </div>
      )}
      {open && options.length === 0 && !query && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1 }}>NO AVAILABLE TEAMS — YOU MAY HAVE USED ALL TEAMS PLAYING THIS WEEK.</div>
        </div>
      )}
    </div>
  );
}

// ── Game Tile ──────────────────────────────────────────────────────────────────
function GameTile({ game, pickedTeam, pickedType, onPick, isLocked }) {
  const isUpsetGame = game.matchupType !== 'p4_vs_p4';

  const renderTeam = (team, isP4, isUsed, winProb, opponent, canWin, canUpset, thursdayLocked) => {
    if (!isP4) return (
      <div style={{ flex: 1, padding: '10px 12px', textAlign: 'center', background: 'var(--green-deep)', borderRadius: 'var(--radius)', opacity: 0.4 }}>
        <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14 }}>{team}</div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>NON-P4</div>
      </div>
    );
    if (thursdayLocked) return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ padding: '10px 12px', textAlign: 'center', background: 'var(--green-deep)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', opacity: 0.5 }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15 }}>{team}</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: '#e05c5c', letterSpacing: 1, marginTop: 2 }}>THU · LOCKED</div>
        </div>
      </div>
    );

    const isPickedWin   = pickedTeam === team && pickedType === 'win_vs_power4';
    const isPickedUpset = pickedTeam === team && pickedType === 'upset_loss';
    const isAnyPicked   = isPickedWin || isPickedUpset;
    const upsetProb     = winProb != null ? 1 - winProb : null;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          padding: '10px 12px', textAlign: 'center',
          background: isUsed ? 'var(--green-deep)' : isAnyPicked ? 'rgba(245,166,35,0.08)' : 'var(--elevated)',
          borderRadius: 'var(--radius)',
          border: `1px solid ${isAnyPicked ? 'var(--amber-dim)' : 'var(--border)'}`,
          opacity: isUsed ? 0.45 : 1,
        }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15 }}>{team}</div>
          {isUsed && <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--red-score)', letterSpacing: 1, marginTop: 2 }}>USED</div>}
          {!isUsed && canWin && winProb != null && (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: probColor(winProb), letterSpacing: 0.5 }}>WIN {pct(winProb)}%</span>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: 'var(--green-text)' }}>EV {winProb.toFixed(2)}pt</span>
              </div>
              <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                <div style={{ height: 2, width: `${pct(winProb)}%`, background: probColor(winProb), borderRadius: 1 }} />
              </div>
            </div>
          )}
          {!isUsed && canUpset && upsetProb != null && (
            <div style={{ marginTop: canWin && winProb != null ? 6 : 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: 'var(--amber)', letterSpacing: 0.5 }}>⚡ UPSET {pct(upsetProb)}%</span>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 8, color: 'var(--green-text)' }}>EV {(upsetProb * 2).toFixed(2)}pt</span>
              </div>
              <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                <div style={{ height: 2, width: `${pct(upsetProb)}%`, background: 'var(--amber)', borderRadius: 1 }} />
              </div>
            </div>
          )}
        </div>
        {!isLocked && !isUsed && (
          <div style={{ display: 'flex', gap: 3 }}>
            {canWin && (
              <button onClick={() => onPick(team, 'win_vs_power4', opponent, winProb)}
                className="btn btn-sm" style={{
                  flex: 1, fontSize: 10, letterSpacing: 0.5, padding: '5px 4px',
                  background: isPickedWin ? 'rgba(245,166,35,0.15)' : 'transparent',
                  border: `1px solid ${isPickedWin ? 'var(--amber)' : 'var(--border)'}`,
                  color: isPickedWin ? 'var(--amber)' : 'var(--cream-dim)',
                }}>
                {isPickedWin ? '✓ WIN' : 'WIN · 1PT'}
              </button>
            )}
            {canUpset && (
              <button onClick={() => onPick(team, 'upset_loss', opponent, upsetProb)}
                className="btn btn-sm" style={{
                  flex: 1, fontSize: 10, letterSpacing: 0.5, padding: '5px 4px',
                  background: isPickedUpset ? 'var(--amber)' : 'rgba(245,166,35,0.06)',
                  border: `1px solid ${isPickedUpset ? 'var(--amber)' : 'var(--amber-dim)'}`,
                  color: isPickedUpset ? 'var(--green-deep)' : 'var(--amber)',
                  fontWeight: isPickedUpset ? 700 : 400,
                }}>
                {isPickedUpset ? '✓ UPSET' : 'UPSET · 2PT'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const homeCanWin   = game.homeIsPower4 && game.awayIsPower4;
  const homeCanUpset = game.homeIsPower4 && !game.awayIsPower4;
  const awayCanWin   = game.awayIsPower4 && game.homeIsPower4;
  const awayCanUpset = game.awayIsPower4 && !game.homeIsPower4;
  const isSelected   = pickedTeam === game.homeTeam || pickedTeam === game.awayTeam;
  const isThursday   = game.thursdayLocked;

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${isSelected ? 'var(--amber-dim)' : isUpsetGame ? 'rgba(245,166,35,0.2)' : 'var(--border)'}`,
      borderLeft: isUpsetGame ? '3px solid var(--amber-dim)' : undefined,
      borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 8, position: 'relative',
    }}>
      {isUpsetGame && <div style={{ position: 'absolute', top: 6, right: 8, fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--amber)', letterSpacing: 2 }}>⚡ UPSET ELIGIBLE</div>}
      {game.gameDate && (
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: game.thursdayLocked ? '#e05c5c' : 'var(--green-text)', letterSpacing: 1, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
          {new Date(game.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}
          {game.thursdayLocked && <span style={{ color: '#e05c5c', letterSpacing: 2 }}>· PICK WINDOW CLOSED</span>}
          {!game.thursdayLocked && new Date(game.gameDate).getDay() === 4 && <span style={{ color: 'var(--amber)', letterSpacing: 2 }}>· PICKS DUE THU NOON</span>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {renderTeam(game.homeTeam, game.homeIsPower4, game.homeUsed, game.homeWinProb, game.awayTeam, homeCanWin, homeCanUpset, isThursday)}
        <div style={{ flexShrink: 0, fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--green-text)', alignSelf: 'center', paddingTop: 4 }}>VS</div>
        {renderTeam(game.awayTeam, game.awayIsPower4, game.awayUsed, game.awayWinProb, game.homeTeam, awayCanWin, awayCanUpset)}
      </div>
    </div>
  );
}


// ── Post-Submit Confirmation Banner ───────────────────────────────────────────
function SubmitConfirmBanner({ submission, onEdit, canEdit }) {
  if (!submission || submission.isScored || submission.isLocked) return null;
  const ts = submission.submittedAt || submission.lastModifiedAt;
  const timeStr = ts ? new Date(ts).toLocaleTimeString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;
  return (
    <div style={{
      background: 'rgba(74,184,112,0.1)', border: '1px solid #4ab870',
      borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#4ab870', letterSpacing: 2 }}>
          PICKS SAVED
        </div>
        {timeStr && (
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1, marginTop: 3 }}>
            SUBMITTED {timeStr.toUpperCase()}
          </div>
        )}
      </div>
      {canEdit && (
        <button className="btn btn-outline btn-sm" onClick={onEdit} style={{ borderColor: '#4ab870', color: '#4ab870', fontSize: 10 }}>
          EDIT PICKS
        </button>
      )}
    </div>
  );
}

// ── Locked Picks View (submitted but not yet scored) ──────────────────────────
function LockedPicksView({ submission }) {
  return (
    <div className="score-card" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#4ab870', letterSpacing: 2 }}>✓ YOU'RE ALL SET</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {submission.wasRandyd && <span className="badge badge-red">RANDY'D</span>}
            <span className="badge badge-gray">LOCKED</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 2 }}>
          PICKS LOCKED IN · RESULTS POSTED AFTER COMMISSIONER SCORES THE WEEK
        </div>
      </div>
      {submission.picks.map((pick, i) => (
        <div key={i} className="pick-slot pending" style={{ marginBottom: 6 }}>
          <div className="pick-num">{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div className="pick-team-name">{pick.team}</div>
            <div className="pick-type-tag" style={{ color: pick.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--green-text)' }}>
              {pick.pickType === 'win_vs_power4' ? 'WIN VS P4 · 1PT' : 'UPSET LOSS · 2PTS'}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: pick.pickType === 'upset_loss' ? 'var(--amber)' : 'var(--cream-dim)' }}>
            {pick.pickType === 'upset_loss' ? '2' : '1'}<span style={{ fontSize: 10, color: 'var(--green-text)' }}>pt</span>
          </div>
        </div>
      ))}

    </div>
  );
}

// ── Scored Picks View ─────────────────────────────────────────────────────────
function ScoredPicksView({ submission }) {
  return (
    <div className="score-card gold" style={{ marginBottom: 16, textAlign: 'center', padding: '20px 24px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, color: 'var(--amber)', lineHeight: 1 }}>{submission.totalPoints}</div>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 3, marginTop: 4 }}>POINTS THIS WEEK</div>
      <div style={{ marginTop: 16 }}>
        {submission.picks.map((pick, i) => (
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
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SubmitPicks() {
  const { week: weekParam } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [weekConfig, setWeekConfig] = useState(null);
  const [games, setGames] = useState([]);
  const [allGames, setAllGames] = useState([]); // unfiltered, for search
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPicks, setCelebrationPicks] = useState([]);
  const [targetWeek, setTargetWeek] = useState(weekParam ? parseInt(weekParam) : null);
  const [viewMode, setViewMode] = useState('tiles'); // 'tiles' | 'search'
  const [askingRandy, setAskingRandy] = useState(false);
  const [randyError, setRandyError] = useState('');
  const [weekList, setWeekList] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const weeksRes = await api.get('/picks/weeks');
        const allWeeks = weeksRes.data.weeks || [];
        setWeekList(allWeeks);
        let week = targetWeek;
        if (!week) {
          const open = allWeeks.find(w => w.isOpen);
          const mostRecent = [...allWeeks].reverse().find(w => w.isScored || w.isOpen);
          week = open?.week || mostRecent?.week || allWeeks[0]?.week || 1;
          setTargetWeek(week);
        }
        const [configRes, gamesRes] = await Promise.all([
          api.get(`/picks/week/${week}`),
          api.get(`/picks/week/${week}/games`).catch(() => ({ data: { games: [] } })),
        ]);
        setWeekConfig(configRes.data.weekConfig);
        setExistingSubmission(configRes.data.submission);
        setGames(gamesRes.data.games || []);
        setAllGames(gamesRes.data.games || []);
        if (configRes.data.submission?.picks?.length > 0) {
          setPicks(configRes.data.submission.picks.map(p => ({ team: p.team, pickType: p.pickType, opponent: '', prob: null })));
        } else {
          setPicks([]);
        }
      } catch (err) {
        setError('Failed to load week data');
      } finally { setLoading(false); }
    }
    load();
  }, [targetWeek]);

  const handlePick = (team, pickType, opponent, prob) => {
    if (!canEdit) return;
    setPicks(prev => {
      const idx = prev.findIndex(p => p.team === team);
      if (idx >= 0 && prev[idx].pickType === pickType) return prev.filter((_, i) => i !== idx);
      if (idx >= 0) return prev.map((p, i) => i === idx ? { team, pickType, opponent, prob } : p);
      return [...prev, { team, pickType, opponent, prob }];
    });
  };

  const removePick = (idx) => setPicks(prev => prev.filter((_, i) => i !== idx));

  const picksRequired = targetWeek <= 2 ? 4 : 5;
  const isPastDeadline = weekConfig?.deadline && new Date() > new Date(weekConfig.deadline);
  const canEdit = weekConfig?.isOpen && !isPastDeadline && !existingSubmission?.isLocked;

  const askRandy = async () => {
    if (!weekConfig) return;
    setAskingRandy(true);
    setRandyError('');
    try {
      const r = await api.post(`/picks/week/${weekConfig.week}/ask-randy`);
      setPicks(r.data.picks.map(p => ({ team: p.team, pickType: p.pickType, opponent: '', prob: null })));
    } catch (err) {
      setRandyError('RANDY FAILED · RETRY');
      setTimeout(() => setRandyError(''), 3000);
    } finally {
      setAskingRandy(false);
    }
  };
  const canSubmit = picks.length === picksRequired && canEdit;

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      await api.post(`/picks/week/${targetWeek}`, { picks: picks.map(p => ({ team: p.team, pickType: p.pickType })) });
      setShowConfirm(false);
      setCelebrationPicks([...picks]);
      setShowCelebration(true);
      const res = await api.get(`/picks/week/${targetWeek}`);
      setExistingSubmission(res.data.submission);
      setSuccess('PICKS SUBMITTED!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit picks');
      setShowConfirm(false);
    } finally { setSaving(false); }
  };

  const weekLabel = targetWeek === 1 ? 'Week 0/1' : `Week ${targetWeek}`;
  const pickedTeamSet = new Set(picks.map(p => p.team));
  const upsetGames = games.filter(g => g.matchupType !== 'p4_vs_p4');
  const p4Games    = games.filter(g => g.matchupType === 'p4_vs_p4');
  const usedTeamsSet = new Set((user?.usedTeams || []).filter(t =>
    !existingSubmission?.picks?.some(p => p.team === t)
  ));

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING WEEK...</div>
    </div>
  );

  return (
    <div>
      {showConfirm && (
        <ConfirmModal picks={picks} weekLabel={weekLabel} onConfirm={handleSubmit} onCancel={() => setShowConfirm(false)} loading={saving} usedTeams={usedTeamsSet} />
      )}

      {showCelebration && (
        <CelebrationOverlay
          picks={celebrationPicks}
          weekLabel={weekLabel}
          onDismiss={() => setShowCelebration(false)}
        />
      )}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>← BACK</button>
            {weekConfig?.isOpen && !isPastDeadline && <span className="badge badge-amber">OPEN</span>}
            {existingSubmission?.isLocked && !existingSubmission?.isScored && <span className="badge badge-gray">LOCKED</span>}
            {existingSubmission?.isScored && <span className="badge badge-green">SCORED</span>}
            {existingSubmission?.wasRandyd && <span className="badge badge-red">RANDY'D</span>}
          </div>
          <h1 className="page-title">{weekLabel.toUpperCase()} PICKS</h1>
          <div className="page-subtitle">
            {weekConfig?.deadline
              ? `DEADLINE: ${new Date(weekConfig.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}`
              : 'THURSDAY NOON'}
          </div>
          {/* Week nav */}
          {weekList.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
              {(() => {
                const sortedWeeks = [...weekList].sort((a, b) => a.week - b.week);
                const currentIdx = sortedWeeks.findIndex(w => w.week === targetWeek);
                const prevWeek = currentIdx > 0 ? sortedWeeks[currentIdx - 1] : null;
                const nextWeek = currentIdx < sortedWeeks.length - 1 ? sortedWeeks[currentIdx + 1] : null;
                return (
                  <>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={!prevWeek}
                      onClick={() => { setTargetWeek(prevWeek.week); }}
                      style={{ fontSize: 10, letterSpacing: 1, opacity: prevWeek ? 1 : 0.3 }}
                    >
                      ‹ {prevWeek ? (prevWeek.week === 1 ? 'WK 0/1' : `WK ${prevWeek.week}`) : ''}
                    </button>
                    <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 1 }}>
                      {sortedWeeks.map(w => (
                        <span
                          key={w.week}
                          onClick={() => setTargetWeek(w.week)}
                          style={{
                            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                            background: w.week === targetWeek ? 'var(--amber)' : 'var(--border)',
                            margin: '0 2px', cursor: 'pointer',
                          }}
                        />
                      ))}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={!nextWeek}
                      onClick={() => { setTargetWeek(nextWeek.week); }}
                      style={{ fontSize: 10, letterSpacing: 1, opacity: nextWeek ? 1 : 0.3 }}
                    >
                      {nextWeek ? (nextWeek.week === 1 ? 'WK 0/1' : `WK ${nextWeek.week}`) : ''} ›
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--amber)', lineHeight: 1 }}>
            {user?.usedTeams?.length || 0}<span style={{ fontSize: 16, color: 'var(--green-text)' }}>/68</span>
          </div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2 }}>TEAMS USED</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {existingSubmission && !existingSubmission.isScored && !existingSubmission.isLocked && !canEdit && (
        <SubmitConfirmBanner submission={existingSubmission} canEdit={false} />
      )}
      {existingSubmission && !existingSubmission.isScored && !existingSubmission.isLocked && canEdit && (
        <SubmitConfirmBanner submission={existingSubmission} canEdit={canEdit} onEdit={() => {}} />
      )}

      {/* Locked — show picks but no edit */}
      {existingSubmission && !canEdit && !existingSubmission.isScored && (
        <LockedPicksView submission={existingSubmission} />
      )}

      {/* Scored — show results */}
      {existingSubmission?.isScored && (
        <ScoredPicksView submission={existingSubmission} />
      )}

      {/* Status alerts */}
      {!weekConfig && <div className="alert alert-warning">THIS WEEK HAS NOT BEEN CONFIGURED YET.</div>}
      {weekConfig && !weekConfig.isOpen && !existingSubmission && <div className="alert alert-info">PICKS ARE NOT OPEN YET.</div>}
      {isPastDeadline && !existingSubmission && <div className="alert alert-warning">DEADLINE HAS PASSED — NO SUBMISSION ON FILE.</div>}

      {/* Pick interface — only when editable */}
      {canEdit && (
        <>
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

          {/* Pick tracker */}
          <div className="score-card" style={{ marginBottom: 14, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: picks.length > 0 ? 10 : 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2 }}>
                YOUR PICKS &nbsp;
                <span style={{ color: picks.length === picksRequired ? '#4ab870' : 'var(--amber)' }}>
                  {picks.length}/{picksRequired}
                </span>
              </div>
              {canSubmit && (
                <button className="btn btn-primary btn-sm" onClick={() => { setError(''); setShowConfirm(true); }}>REVIEW →</button>
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
                    {p.prob != null && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)' }}>{pct(p.prob)}%</span>}
                    <button onClick={() => removePick(i)} style={{ background: 'none', border: 'none', color: 'var(--green-text)', cursor: 'pointer', fontSize: 11, padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* View toggle + Ask Randy */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`btn btn-sm ${viewMode === 'tiles' ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => setViewMode('tiles')}
              style={{ borderColor: viewMode === 'tiles' ? 'var(--amber)' : undefined, color: viewMode === 'tiles' ? 'var(--amber)' : undefined }}
            >
              ▦ GAME TILES
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'search' ? 'btn-outline' : 'btn-ghost'}`}
              onClick={() => setViewMode('search')}
              style={{ borderColor: viewMode === 'search' ? 'var(--amber)' : undefined, color: viewMode === 'search' ? 'var(--amber)' : undefined }}
            >
              ⌕ SEARCH TEAMS
            </button>
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-sm btn-ghost"
              onClick={askRandy}
              disabled={askingRandy || isPastDeadline}
              title="Let Randy randomly fill your picks — re-roll as many times as you like before submitting"
              style={{
                borderColor: randyError ? '#e05c5c' : 'rgba(245,166,35,0.4)',
                color: randyError ? '#e05c5c' : askingRandy ? 'var(--green-text)' : 'var(--amber)',
                border: '1px solid',
                fontSize: 11, letterSpacing: 1,
              }}
            >
              {askingRandy ? '🎲 ASKING...' : randyError ? randyError : '🎲 ASK RANDY'}
            </button>
          </div>

          {/* Search mode */}
          {viewMode === 'search' && (
            <TeamSearch allGames={allGames} picks={picks} onPick={handlePick} usedTeams={usedTeamsSet} />
          )}

          {/* Tile mode */}
          {viewMode === 'tiles' && games.length === 0 && (
            <div className="alert alert-info">NO AVAILABLE GAMES — YOU MAY HAVE USED ALL TEAMS PLAYING THIS WEEK.</div>
          )}
          {viewMode === 'tiles' && games.length > 0 && (
            <div style={{ paddingBottom: canSubmit ? 88 : 0 }}>
              {upsetGames.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--amber)', letterSpacing: 3, marginBottom: 10, display: 'flex', gap: 8 }}>
                    <span>⚡ UPSET ELIGIBLE</span>
                    <span style={{ color: 'var(--green-text)' }}>P4 PLAYS NON-P4 · 2 PTS IF THEY LOSE</span>
                  </div>
                  {upsetGames.map((g, i) => (
                    <GameTile key={g._id || i} game={g}
                      pickedTeam={pickedTeamSet.has(g.homeTeam) ? g.homeTeam : pickedTeamSet.has(g.awayTeam) ? g.awayTeam : null}
                      pickedType={picks.find(p => p.team === g.homeTeam || p.team === g.awayTeam)?.pickType}
                      onPick={handlePick} isLocked={false}
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
                      onPick={handlePick} isLocked={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom CTA — sticky on mobile */}
          {canSubmit && (
            <div style={{
              position: 'sticky', bottom: 0, zIndex: 10,
              background: 'linear-gradient(to top, var(--bg) 70%, transparent)',
              padding: '20px 0 24px', marginTop: 12,
              display: 'flex', justifyContent: 'flex-end',
            }}>
              <button className="btn btn-primary btn-lg" onClick={() => { setError(''); setShowConfirm(true); }} style={{ minWidth: 220, boxShadow: '0 4px 24px rgba(245,166,35,0.25)' }}>
                {existingSubmission ? 'UPDATE PICKS →' : 'REVIEW & SUBMIT →'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
