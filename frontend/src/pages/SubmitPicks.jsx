import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ── Celebration Overlay ────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#f5a623','#ffbe4d','var(--green-pencil)','#f0e6c8','#c4821a','#8bb89a','#d64c2a'];
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
              <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--green-text)', letterSpacing: 1 }}>
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
  if (prob >= 0.70) return 'var(--green-pencil)';
  if (prob >= 0.50) return 'var(--cream-dim)';
  if (prob >= 0.35) return 'var(--amber)';
  return 'var(--red-pencil)';
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ picks, weekLabel, onConfirm, onCancel, loading, usedTeams = new Set() }) {
  const maxPts = picks.reduce((s, p) => s + (p.pickType === 'upset_loss' ? 2 : 1), 0);
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title">CONFIRM PICKS</div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
          {weekLabel.toUpperCase()} · {picks.length} PICKS · UP TO {maxPts} PTS
        </div>
        {picks.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', marginBottom: 6,
            background: p.pickType === 'upset_loss' ? 'rgba(200,146,42,0.08)' : 'var(--elevated)',
            border: `1px solid ${p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--border)'}`,
          }}>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--text-muted)', width: 16, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                {p.team}
                {usedTeams.has(p.team) && <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--red-pencil)', marginLeft: 8 }}>⚠ USED</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--text-muted)', letterSpacing: 1, marginTop: 2 }}>
                {p.pickType === 'win_vs_power4' ? `WIN vs ${p.opponent || '—'}` : `UPSET LOSS to ${p.opponent || '—'}`}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--text-secondary)', flexShrink: 0 }}>
              {p.pickType === 'upset_loss' ? '2' : '1'}<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>pt</span>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading} style={{ flex: 1 }}>← EDIT</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading} style={{ flex: 2 }}>
            {loading ? 'SUBMITTING...' : 'LOCK IN PICKS →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lean Game Tile ─────────────────────────────────────────────────────────────
// One row per game. Team name + pick button. Tap team name to see prob detail.
function GameTile({ game, pickedTeam, pickedType, onPick, isLocked }) {
  const [expanded, setExpanded] = useState(false);
  const isUpsetGame = game.matchupType !== 'p4_vs_p4';

  const renderSide = (team, isP4, isUsed, winProb, opponent, canWin, canUpset, thursdayLocked) => {
    if (!isP4) return (
      <div style={{ flex: 1, padding: '10px 12px', opacity: 0.35, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>{team}</div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>NON-P4</div>
      </div>
    );

    const isUpset      = canUpset && !canWin;
    const isPicked     = pickedTeam === team;
    const pickType     = isUpset ? 'upset_loss' : 'win_vs_power4';
    const upsetProb    = winProb != null ? 1 - winProb : null;
    const displayProb  = isUpset ? upsetProb : winProb;
    const pts          = isUpset ? 2 : 1;

    if (thursdayLocked) return (
      <div style={{ flex: 1, padding: '10px 12px', opacity: 0.4, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)' }}>{team}</div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--red-pencil)', letterSpacing: 1, marginTop: 2 }}>LOCKED</div>
      </div>
    );

    if (isUsed) return (
      <div style={{ flex: 1, padding: '10px 12px', opacity: 0.35, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)' }}>{team}</div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--red-pencil)', letterSpacing: 1, marginTop: 2 }}>USED</div>
      </div>
    );

    return (
      <div style={{ flex: 1 }}>
        <button
          onClick={() => onPick(team, pickType, opponent, isUpset ? upsetProb : winProb)}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 12px', textAlign: 'center',
            background: isPicked
              ? (isUpset ? 'var(--amber-pencil)' : 'var(--ink)')
              : 'transparent',
            borderRadius: 'var(--radius)',
            transition: 'background 0.1s',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15,
            color: isPicked ? 'var(--paper)' : 'var(--text-primary)',
          }}>
            {isPicked ? '✓ ' : ''}{team}
          </div>
          <div style={{
            fontFamily: 'var(--font-scoreboard)', fontSize: 10, letterSpacing: 1, marginTop: 3,
            color: isPicked ? (isUpset ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.6)') :
              (isUpset ? 'var(--amber-pencil)' : 'var(--text-muted)'),
          }}>
            {isUpset ? `⚡ UPSET · 2PT` : `WIN · 1PT`}
            {expanded && displayProb != null ? ` · ${Math.round(displayProb * 100)}%` : ''}
          </div>
        </button>
      </div>
    );
  };

  const homeCanWin   = game.homeIsPower4 && game.awayIsPower4;
  const homeCanUpset = game.homeIsPower4 && !game.awayIsPower4;
  const awayCanWin   = game.awayIsPower4 && game.homeIsPower4;
  const awayCanUpset = game.awayIsPower4 && !game.homeIsPower4;
  const isSelected   = pickedTeam === game.homeTeam || pickedTeam === game.awayTeam;

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${isSelected ? 'var(--amber-pencil)' : isUpsetGame ? 'rgba(200,146,42,0.18)' : 'var(--border)'}`,
      borderLeft: isUpsetGame ? `3px solid ${isSelected ? 'var(--amber-pencil)' : 'rgba(200,146,42,0.4)'}` : undefined,
      marginBottom: 6,
    }}>
      {/* Game date + expand toggle */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 10px', cursor: 'pointer',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: game.thursdayLocked ? 'var(--red-pencil)' : 'var(--text-muted)', letterSpacing: 1 }}>
          {game.gameDate
            ? new Date(game.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()
            : '—'}
          {game.thursdayLocked && ' · LOCKED'}
          {!game.thursdayLocked && new Date(game.gameDate)?.getDay() === 4 && ' · THU DEADLINE'}
        </div>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>
          {isUpsetGame ? '⚡ 2PT' : '1PT'} {expanded ? '▲' : '▼'}
        </div>
      </div>

      {/* Teams row */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
        {renderSide(game.homeTeam, game.homeIsPower4, game.homeUsed, game.homeWinProb, game.awayTeam, homeCanWin, homeCanUpset, game.thursdayLocked)}
        <div style={{ width: 1, background: 'var(--rule)', alignSelf: 'stretch', flexShrink: 0 }} />
        {renderSide(game.awayTeam, game.awayIsPower4, game.awayUsed, game.awayWinProb, game.homeTeam, awayCanWin, awayCanUpset, game.thursdayLocked)}
      </div>

      {/* Expanded prob detail */}
      {expanded && (game.homeWinProb != null || game.awayWinProb != null) && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--rule)', display: 'flex', gap: 12 }}>
          {game.homeIsPower4 && game.homeWinProb != null && (
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>{game.homeTeam}</span>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-secondary)' }}>{Math.round(game.homeWinProb * 100)}%</span>
              </div>
              <div style={{ height: 2, background: 'var(--border)' }}>
                <div style={{ height: 2, width: `${Math.round(game.homeWinProb * 100)}%`, background: 'var(--ink-light)' }} />
              </div>
            </div>
          )}
          {game.awayIsPower4 && game.awayWinProb != null && (
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>{game.awayTeam}</span>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-secondary)' }}>{Math.round(game.awayWinProb * 100)}%</span>
              </div>
              <div style={{ height: 2, background: 'var(--border)' }}>
                <div style={{ height: 2, width: `${Math.round(game.awayWinProb * 100)}%`, background: 'var(--ink-light)' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Team Search ────────────────────────────────────────────────────────────────
function TeamSearch({ allGames, picks, onPick, usedTeams }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options = [];
  for (const g of allGames) {
    if (g.homeIsPower4 && !usedTeams.has(g.homeTeam) && !g.thursdayLocked) {
      const canWin = g.matchupType === 'p4_vs_p4';
      const canUpset = g.matchupType === 'p4_vs_nonp4';
      const upsetProb = g.homeWinProb != null ? 1 - g.homeWinProb : null;
      if (canWin) options.push({ team: g.homeTeam, pickType: 'win_vs_power4', opponent: g.awayTeam, prob: g.homeWinProb, pts: 1 });
      if (canUpset) options.push({ team: g.homeTeam, pickType: 'upset_loss', opponent: g.awayTeam, prob: upsetProb, pts: 2 });
    }
    if (g.awayIsPower4 && !usedTeams.has(g.awayTeam) && !g.thursdayLocked) {
      const canWin = g.matchupType === 'p4_vs_p4';
      const canUpset = g.matchupType === 'nonp4_vs_p4';
      const upsetProb = g.awayWinProb != null ? 1 - g.awayWinProb : null;
      if (canWin) options.push({ team: g.awayTeam, pickType: 'win_vs_power4', opponent: g.homeTeam, prob: g.awayWinProb, pts: 1 });
      if (canUpset) options.push({ team: g.awayTeam, pickType: 'upset_loss', opponent: g.homeTeam, prob: upsetProb, pts: 2 });
    }
  }

  const pickedKeys = new Set(picks.map(p => `${p.team}|${p.pickType}`));
  const filtered = options.filter(o =>
    !query || o.team.toLowerCase().includes(query.toLowerCase()) || o.opponent?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 14 }}>
      <input
        className="form-input"
        placeholder="Search teams..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={{ fontFamily: 'var(--font-scoreboard)', letterSpacing: 1, fontSize: 14 }}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--elevated)', border: '1px solid var(--amber-pencil)',
          maxHeight: 260, overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(20,18,16,0.15)',
        }}>
          {filtered.map((o, i) => {
            const isPicked = pickedKeys.has(`${o.team}|${o.pickType}`);
            return (
              <div
                key={i}
                onClick={() => { onPick(o.team, o.pickType, o.opponent, o.prob); setQuery(''); setOpen(false); }}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: isPicked ? 'rgba(200,146,42,0.1)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, color: isPicked ? 'var(--amber-pencil)' : 'var(--text-primary)' }}>
                    {isPicked ? '✓ ' : ''}{o.team}
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: o.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--text-muted)', letterSpacing: 1 }}>
                    {o.pickType === 'upset_loss' ? `⚡ UPSET vs ${o.opponent}` : `WIN vs ${o.opponent}`}
                    {o.prob != null ? ` · ${Math.round(o.prob * 100)}%` : ''}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: o.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--text-muted)', flexShrink: 0 }}>
                  {o.pts}pt
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Locked Picks View ──────────────────────────────────────────────────────────
function LockedPicksView({ submission }) {
  return (
    <div className="score-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--green-pencil)', letterSpacing: 1 }}>✓ YOU'RE ALL SET</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {submission.wasRandyd && <span className="badge badge-red">RANDY'D</span>}
          <span className="badge badge-gray">LOCKED</span>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 14 }}>
        RESULTS POSTED AFTER COMMISSIONER SCORES THE WEEK
      </div>
      {submission.picks.map((pick, i) => (
        <div key={i} className={`pick-slot pending`} style={{ marginBottom: 6 }}>
          <div className="pick-num">{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div className="pick-team-name">{pick.team}{pick.opponent ? <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>vs {pick.opponent}</span> : ''}</div>
            <div className="pick-type-tag" style={{ color: pick.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--text-muted)' }}>
              {pick.pickType === 'win_vs_power4' ? 'WIN · 1PT' : '⚡ UPSET LOSS · 2PT'}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: pick.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--text-secondary)' }}>
            {pick.pickType === 'upset_loss' ? '2' : '1'}<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>pt</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Scored Picks View ──────────────────────────────────────────────────────────
function ScoredPicksView({ submission }) {
  return (
    <div className="score-card gold" style={{ marginBottom: 16, textAlign: 'center', padding: '20px 24px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, color: 'var(--amber-pencil)', lineHeight: 1 }}>{submission.totalPoints}</div>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--text-muted)', letterSpacing: 3, marginTop: 4, marginBottom: 16 }}>POINTS THIS WEEK</div>
      {submission.picks.map((pick, i) => (
        <div key={i} className={`pick-slot ${pick.result || 'pending'}`} style={{ marginBottom: 6, textAlign: 'left' }}>
          <div className="pick-num">{i + 1}</div>
          <div style={{ flex: 1 }}>
            <div className="pick-team-name">{pick.team}{pick.opponent ? <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>vs {pick.opponent}</span> : ''}</div>
            <div className="pick-type-tag">{pick.pickType === 'win_vs_power4' ? 'WIN · 1PT' : '⚡ UPSET LOSS · 2PT'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: pick.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-score)' }}>{pick.pointsEarned}pt</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: pick.result === 'correct' ? 'var(--green-pencil)' : 'var(--red-score)', letterSpacing: 1 }}>{pick.result?.toUpperCase()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SubmitPicks() {
  const { week: weekParam } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [weekConfig, setWeekConfig]             = useState(null);
  const [games, setGames]                       = useState([]);
  const [allGames, setAllGames]                 = useState([]);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [picks, setPicks]                       = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState('');
  const [showConfirm, setShowConfirm]           = useState(false);
  const [showCelebration, setShowCelebration]   = useState(false);
  const [celebrationPicks, setCelebrationPicks] = useState([]);
  const [targetWeek, setTargetWeek]             = useState(weekParam ? parseInt(weekParam) : null);
  const [askingRandy, setAskingRandy]           = useState(false);
  const [randyError, setRandyError]             = useState('');
  const [weekList, setWeekList]                 = useState([]);
  const [showSearch, setShowSearch]             = useState(false);
  const [trayOpen, setTrayOpen]                 = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setWeekConfig(null); setExistingSubmission(null);
      setGames([]); setAllGames([]); setPicks([]);
      setError(''); setSuccess(''); setLoading(true);
      try {
        const weeksRes = await api.get('/picks/weeks', { signal: controller.signal });
        const allWeeks = weeksRes.data.weeks || [];
        setWeekList(allWeeks);
        let week = targetWeek;
        if (!week) {
          const open = allWeeks.find(w => w.isOpen);
          const mostRecent = [...allWeeks].reverse().find(w => w.isScored || w.isOpen);
          week = open?.week || mostRecent?.week || allWeeks[0]?.week || 1;
        }
        const [configRes, gamesRes] = await Promise.all([
          api.get(`/picks/week/${week}`, { signal: controller.signal }),
          api.get(`/picks/week/${week}/games`, { signal: controller.signal }).catch(e => {
            if (e.name === 'CanceledError' || e.name === 'AbortError') throw e;
            return { data: { games: [] } };
          }),
        ]);
        setWeekConfig(configRes.data.weekConfig);
        const loadedGames = gamesRes.data.games || [];
        setGames(loadedGames); setAllGames(loadedGames);
        const clientOppMap = {};
        for (const g of loadedGames) {
          if (g.homeTeam) clientOppMap[g.homeTeam] = g.awayTeam;
          if (g.awayTeam) clientOppMap[g.awayTeam] = g.homeTeam;
        }
        const rawSub = configRes.data.submission;
        let enrichedSub = rawSub;
        if (rawSub?.picks?.length > 0) {
          enrichedSub = { ...rawSub, picks: rawSub.picks.map(p => ({ ...p, opponent: p.opponent || clientOppMap[p.team] || null })) };
        }
        setExistingSubmission(enrichedSub);
        if (enrichedSub?.picks?.length > 0) {
          setPicks(enrichedSub.picks.map(p => ({ team: p.team, pickType: p.pickType, opponent: p.opponent || '', prob: null })));
        }
        if (!targetWeek && week) setTargetWeek(week);
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setError('Failed to load week data');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
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

  const picksRequired = weekConfig?.picksRequired || (targetWeek <= 2 ? 4 : 5);
  const isPastDeadline = weekConfig?.deadline && new Date() > new Date(weekConfig.deadline);
  const canEdit = weekConfig?.isOpen && !isPastDeadline && !existingSubmission?.isLocked;
  const canSubmit = picks.length === picksRequired && canEdit;

  const askRandy = async () => {
    if (!weekConfig) return;
    setAskingRandy(true); setRandyError('');
    try {
      const r = await api.post(`/picks/week/${weekConfig.week}/ask-randy`);
      setPicks(r.data.picks.map(p => ({ team: p.team, pickType: p.pickType, opponent: '', prob: null })));
    } catch {
      setRandyError('RETRY');
      setTimeout(() => setRandyError(''), 3000);
    } finally { setAskingRandy(false); }
  };

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
  const usedTeamsSet = new Set((user?.usedTeams || []).filter(t =>
    !existingSubmission?.picks?.some(p => p.team === t)
  ));
  const gameIsAvailable = (g) => {
    const homeAvail = g.homeIsPower4 && !usedTeamsSet.has(g.homeTeam) && !g.thursdayLocked;
    const awayAvail = g.awayIsPower4 && !usedTeamsSet.has(g.awayTeam) && !g.thursdayLocked;
    return homeAvail || awayAvail;
  };
  const upsetGames = games.filter(g => g.matchupType !== 'p4_vs_p4').sort((a, b) => (gameIsAvailable(b) ? 1 : 0) - (gameIsAvailable(a) ? 1 : 0));
  const p4Games    = games.filter(g => g.matchupType === 'p4_vs_p4').sort((a, b) => (gameIsAvailable(b) ? 1 : 0) - (gameIsAvailable(a) ? 1 : 0));

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING WEEK...</div>
    </div>
  );

  // How many picks slots are filled vs empty
  const filledSlots  = picks.length;
  const emptySlots   = Math.max(0, picksRequired - filledSlots);

  return (
    <div style={{ paddingBottom: canEdit ? 140 : 0 }}>
      {showConfirm && (
        <ConfirmModal picks={picks} weekLabel={weekLabel} onConfirm={handleSubmit} onCancel={() => setShowConfirm(false)} loading={saving} usedTeams={usedTeamsSet} />
      )}
      {showCelebration && (
        <CelebrationOverlay picks={celebrationPicks} weekLabel={weekLabel} onDismiss={() => setShowCelebration(false)} />
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>← BACK</button>
            {weekConfig?.isOpen && !isPastDeadline && <span className="badge badge-amber">OPEN</span>}
            {existingSubmission?.isLocked && !existingSubmission?.isScored && <span className="badge badge-gray">LOCKED</span>}
            {existingSubmission?.isScored && <span className="badge badge-green">SCORED</span>}
            {existingSubmission?.wasRandyd && <span className="badge badge-red">RANDY'D</span>}
          </div>
          <h1 className="page-title">{weekLabel.toUpperCase()}</h1>
          <div className="page-subtitle">
            {weekConfig?.deadline
              ? `DEADLINE ${new Date(weekConfig.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}`
              : 'THURSDAY NOON DEADLINE'}
          </div>
        </div>
        {/* Teams used counter */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--amber-pencil)', lineHeight: 1 }}>
            {user?.usedTeams?.length || 0}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/68</span>
          </div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>USED</div>
        </div>
      </div>

      {/* Week nav */}
      {weekList.length > 1 && (() => {
        const sortedWeeks = [...weekList].sort((a, b) => a.week - b.week);
        const currentIdx = sortedWeeks.findIndex(w => w.week === targetWeek);
        const prevWeek = currentIdx > 0 ? sortedWeeks[currentIdx - 1] : null;
        const nextWeek = currentIdx < sortedWeeks.length - 1 ? sortedWeeks[currentIdx + 1] : null;
        return (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={!prevWeek} onClick={() => setTargetWeek(prevWeek.week)} style={{ opacity: prevWeek ? 1 : 0.3 }}>
              ‹ {prevWeek ? (prevWeek.week === 1 ? 'WK 0/1' : `WK ${prevWeek.week}`) : ''}
            </button>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 4 }}>
              {sortedWeeks.map(w => (
                <span key={w.week} onClick={() => setTargetWeek(w.week)} style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                  background: w.week === targetWeek ? 'var(--amber-pencil)' : 'var(--border)',
                  transition: 'background 0.15s',
                }} />
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" disabled={!nextWeek} onClick={() => setTargetWeek(nextWeek.week)} style={{ opacity: nextWeek ? 1 : 0.3 }}>
              {nextWeek ? (nextWeek.week === 1 ? 'WK 0/1' : `WK ${nextWeek.week}`) : ''} ›
            </button>
          </div>
        );
      })()}

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Status states */}
      {!weekConfig && <div className="alert alert-warning">THIS WEEK HAS NOT BEEN CONFIGURED YET.</div>}
      {weekConfig && !weekConfig.isOpen && !existingSubmission && <div className="alert alert-info">PICKS ARE NOT OPEN YET.</div>}
      {isPastDeadline && !existingSubmission && <div className="alert alert-warning">DEADLINE HAS PASSED — NO SUBMISSION ON FILE.</div>}

      {/* Locked / Scored states */}
      {existingSubmission?.isScored && <ScoredPicksView submission={existingSubmission} />}
      {existingSubmission && !canEdit && !existingSubmission.isScored && <LockedPicksView submission={existingSubmission} />}

      {/* ── Pick interface ── */}
      {canEdit && (
        <>
          {/* Search bar — always visible at top when open */}
          {showSearch && (
            <TeamSearch allGames={allGames} picks={picks} onPick={handlePick} usedTeams={usedTeamsSet} />
          )}

          {/* Section: Upset games */}
          {upsetGames.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--amber-pencil)', letterSpacing: 3, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚡ UPSET ELIGIBLE</span>
                <span style={{ color: 'var(--text-muted)' }}>· 2 PTS IF P4 LOSES TO NON-P4</span>
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

          {/* Section: P4 vs P4 games */}
          {p4Games.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 8 }}>
                P4 VS P4 · 1 PT FOR WIN
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

          {games.length === 0 && (
            <div className="alert alert-info">NO AVAILABLE GAMES — YOU MAY HAVE USED ALL TEAMS PLAYING THIS WEEK.</div>
          )}
        </>
      )}

      {/* ── Sticky bottom tray ── */}
      {canEdit && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'var(--paper)',
          borderTop: `2px solid ${canSubmit ? 'var(--amber-pencil)' : 'var(--border)'}`,
          boxShadow: '0 -4px 20px rgba(20,18,16,0.12)',
          // On desktop, offset by sidebar width
          marginLeft: 'var(--sidebar-w, 0)',
        }}>
          {/* Pick slots row */}
          <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto' }}>
            {/* Filled picks */}
            {picks.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                background: p.pickType === 'upset_loss' ? 'rgba(200,146,42,0.12)' : 'var(--elevated)',
                border: `1px solid ${p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--border)'}`,
                padding: '4px 8px 4px 10px',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{p.team}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--text-muted)', letterSpacing: 1 }}>
                    {p.pickType === 'upset_loss' ? '⚡2PT' : '1PT'}
                  </div>
                </div>
                <button onClick={() => removePick(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                width: 52, height: 38, flexShrink: 0,
                border: '1px dashed var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>
                  {filledSlots + i + 1}
                </div>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            {/* Count */}
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: canSubmit ? 'var(--amber-pencil)' : 'var(--text-muted)', letterSpacing: 1, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {picks.length}/{picksRequired}
            </div>
          </div>

          {/* Action row */}
          <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Search toggle */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowSearch(s => !s)}
              style={{ fontSize: 13, color: showSearch ? 'var(--amber-pencil)' : undefined, borderColor: showSearch ? 'var(--amber-pencil)' : undefined }}
            >
              {showSearch ? '✕ SEARCH' : '⌕ SEARCH'}
            </button>
            {/* Randy */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={askRandy}
              disabled={askingRandy || isPastDeadline}
              style={{ fontSize: 13, color: randyError ? 'var(--red-pencil)' : 'var(--amber-pencil)', borderColor: 'rgba(200,146,42,0.35)' }}
            >
              {askingRandy ? '🎲...' : randyError ? '⚠ RETRY' : '🎲 RANDY'}
            </button>
            <div style={{ flex: 1 }} />
            {/* Submit */}
            <button
              className="btn btn-primary"
              disabled={!canSubmit}
              onClick={() => { setError(''); setShowConfirm(true); }}
              style={{
                opacity: canSubmit ? 1 : 0.4,
                minWidth: 160, fontSize: 13,
                transition: 'opacity 0.2s',
              }}
            >
              {existingSubmission ? 'UPDATE →' : canSubmit ? 'SUBMIT PICKS →' : `PICK ${emptySlots} MORE`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
