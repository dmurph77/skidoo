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
                {p.pickType === 'win_vs_power4' ? `WIN vs ${p.opponent || '—'}` : `⚡ UPSET LOSS to ${p.opponent || '—'}`}
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

// ── Game Card ──────────────────────────────────────────────────────────────────
// One card per game. Each pickable team is a full-width tap target.
// Non-P4, used, and locked teams show as disabled rows — no confusion about what's tappable.
function GameCard({ game, pickedTeam, onPick }) {
  const isUpsetGame = game.matchupType !== 'p4_vs_p4';

  const homeCanWin   = game.homeIsPower4 && game.awayIsPower4;
  const homeCanUpset = game.homeIsPower4 && !game.awayIsPower4;
  const awayCanWin   = game.awayIsPower4 && game.homeIsPower4;
  const awayCanUpset = game.awayIsPower4 && !game.homeIsPower4;

  const isSelected = pickedTeam === game.homeTeam || pickedTeam === game.awayTeam;

  const renderTeamRow = (team, isP4, isUsed, winProb, opponent, canWin, canUpset, thursdayLocked) => {
    const isUpset    = canUpset && !canWin;
    const isPicked   = pickedTeam === team;
    const pickType   = isUpset ? 'upset_loss' : 'win_vs_power4';
    const upsetProb  = winProb != null ? 1 - winProb : null;
    const displayProb = isUpset ? upsetProb : winProb;
    const pts        = isUpset ? 2 : 1;
    const unavailable = !isP4 || isUsed || thursdayLocked || (!canWin && !canUpset);

    if (unavailable) {
      const reason = !isP4 ? 'NON-P4' : isUsed ? 'USED' : thursdayLocked ? 'LOCKED' : '';
      return (
        <div key={team} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 14px',
          borderTop: '1px solid var(--rule)',
          opacity: 0.35,
        }}>
          <div style={{ flex: 1, fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16, color: 'var(--text-secondary)' }}>{team}</div>
          {reason && <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>{reason}</div>}
        </div>
      );
    }

    return (
      <button
        key={team}
        onClick={() => onPick(team, pickType, opponent, isUpset ? upsetProb : winProb)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 14px',
          borderTop: '1px solid var(--rule)',
          background: isPicked
            ? (isUpset ? 'var(--amber-pencil)' : 'var(--ink)')
            : 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.1s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Checkmark or bullet */}
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${isPicked ? (isUpset ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)') : (isUpset ? 'var(--amber-pencil)' : 'var(--border)')}`,
          background: isPicked ? (isUpset ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)') : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPicked && <div style={{ width: 8, height: 8, borderRadius: '50%', background: isPicked ? 'white' : 'transparent' }} />}
        </div>

        {/* Team name */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 17,
            color: isPicked ? 'white' : 'var(--text-primary)',
            lineHeight: 1.1,
          }}>
            {team}
          </div>
          <div style={{
            fontFamily: 'var(--font-scoreboard)', fontSize: 10, letterSpacing: 1, marginTop: 2,
            color: isPicked
              ? (isUpset ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.55)')
              : (isUpset ? 'var(--amber-pencil)' : 'var(--text-muted)'),
          }}>
            {isUpset ? `⚡ UPSET PICK` : `WIN vs ${opponent}`}
            {displayProb != null ? ` · ${pct(displayProb)}%` : ''}
          </div>
        </div>

        {/* Points badge */}
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 20,
          color: isPicked
            ? (isUpset ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)')
            : (isUpset ? 'var(--amber-pencil)' : 'var(--text-muted)'),
          flexShrink: 0,
          lineHeight: 1,
        }}>
          {pts}<span style={{ fontSize: 11, opacity: 0.7 }}>pt</span>
        </div>
      </button>
    );
  };

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${isSelected ? 'var(--amber-pencil)' : isUpsetGame ? 'rgba(200,146,42,0.2)' : 'var(--border)'}`,
      borderLeft: isUpsetGame ? `3px solid ${isSelected ? 'var(--amber-pencil)' : 'rgba(200,146,42,0.4)'}` : `3px solid transparent`,
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      {/* Game header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 14px',
        background: 'var(--elevated)',
        borderBottom: '1px solid var(--rule)',
      }}>
        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: game.thursdayLocked ? 'var(--red-pencil)' : 'var(--text-muted)', letterSpacing: 1 }}>
          {game.gameDate
            ? new Date(game.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()
            : '—'}
          {game.thursdayLocked && ' · LOCKED'}
          {!game.thursdayLocked && game.gameDate && new Date(game.gameDate).getDay() === 4 && ' · PICK BY THU NOON'}
        </div>
        {isUpsetGame && (
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--amber-pencil)', letterSpacing: 1 }}>
            ⚡ 2PT
          </div>
        )}
      </div>

      {/* Home team row */}
      {renderTeamRow(game.homeTeam, game.homeIsPower4, game.homeUsed, game.homeWinProb, game.awayTeam, homeCanWin, homeCanUpset, game.thursdayLocked)}

      {/* Away team row */}
      {renderTeamRow(game.awayTeam, game.awayIsPower4, game.awayUsed, game.awayWinProb, game.homeTeam, awayCanWin, awayCanUpset, game.thursdayLocked)}
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
        <div key={i} className="pick-slot pending" style={{ marginBottom: 6 }}>
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

  const [weekConfig, setWeekConfig]               = useState(null);
  const [games, setGames]                         = useState([]);
  const [allGames, setAllGames]                   = useState([]);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [picks, setPicks]                         = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [saving, setSaving]                       = useState(false);
  const [error, setError]                         = useState('');
  const [success, setSuccess]                     = useState('');
  const [showConfirm, setShowConfirm]             = useState(false);
  const [showCelebration, setShowCelebration]     = useState(false);
  const [celebrationPicks, setCelebrationPicks]   = useState([]);
  const [targetWeek, setTargetWeek]               = useState(weekParam ? parseInt(weekParam) : null);
  const [askingRandy, setAskingRandy]             = useState(false);
  const [randyError, setRandyError]               = useState('');
  const [weekList, setWeekList]                   = useState([]);

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
      // tap same pick = deselect
      if (idx >= 0 && prev[idx].pickType === pickType) return prev.filter((_, i) => i !== idx);
      // replace if already have a pick for this team
      if (idx >= 0) return prev.map((p, i) => i === idx ? { team, pickType, opponent, prob } : p);
      return [...prev, { team, pickType, opponent, prob }];
    });
  };

  const removePick = (idx) => setPicks(prev => prev.filter((_, i) => i !== idx));

  const picksRequired   = weekConfig?.picksRequired || (targetWeek <= 2 ? 4 : 5);
  const isPastDeadline  = weekConfig?.deadline && new Date() > new Date(weekConfig.deadline);
  const canEdit         = weekConfig?.isOpen && !isPastDeadline && !existingSubmission?.isLocked;
  const canSubmit       = picks.length === picksRequired && canEdit;
  const filledSlots     = picks.length;
  const emptySlots      = Math.max(0, picksRequired - filledSlots);

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

  const weekLabel     = targetWeek === 1 ? 'Week 0/1' : `Week ${targetWeek}`;
  const pickedTeamSet = new Set(picks.map(p => p.team));
  const usedTeamsSet  = new Set((user?.usedTeams || []).filter(t =>
    !existingSubmission?.picks?.some(p => p.team === t)
  ));

  const gameIsAvailable = (g) => {
    const homeAvail = g.homeIsPower4 && !usedTeamsSet.has(g.homeTeam) && !g.thursdayLocked;
    const awayAvail = g.awayIsPower4 && !usedTeamsSet.has(g.awayTeam) && !g.thursdayLocked;
    return homeAvail || awayAvail;
  };

  // Sort: available games first, then unavailable
  const upsetGames = games
    .filter(g => g.matchupType !== 'p4_vs_p4')
    .sort((a, b) => (gameIsAvailable(b) ? 1 : 0) - (gameIsAvailable(a) ? 1 : 0));
  const p4Games = games
    .filter(g => g.matchupType === 'p4_vs_p4')
    .sort((a, b) => (gameIsAvailable(b) ? 1 : 0) - (gameIsAvailable(a) ? 1 : 0));

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING WEEK...</div>
    </div>
  );

  return (
    <div style={{ paddingBottom: canEdit ? 160 : 0 }}>
      {showConfirm && (
        <ConfirmModal picks={picks} weekLabel={weekLabel} onConfirm={handleSubmit} onCancel={() => setShowConfirm(false)} loading={saving} usedTeams={usedTeamsSet} />
      )}
      {showCelebration && (
        <CelebrationOverlay picks={celebrationPicks} weekLabel={weekLabel} onDismiss={() => setShowCelebration(false)} />
      )}

      {/* ── Page header ── */}
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
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--amber-pencil)', lineHeight: 1 }}>
            {user?.usedTeams?.length || 0}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/68</span>
          </div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>TEAMS USED</div>
        </div>
      </div>

      {/* Week nav */}
      {weekList.length > 1 && (() => {
        const sorted = [...weekList].sort((a, b) => a.week - b.week);
        const idx    = sorted.findIndex(w => w.week === targetWeek);
        const prev   = idx > 0 ? sorted[idx - 1] : null;
        const next   = idx < sorted.length - 1 ? sorted[idx + 1] : null;
        return (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={!prev} onClick={() => setTargetWeek(prev.week)} style={{ opacity: prev ? 1 : 0.3 }}>
              ‹ {prev ? (prev.week === 1 ? 'WK 0/1' : `WK ${prev.week}`) : ''}
            </button>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 4 }}>
              {sorted.map(w => (
                <span key={w.week} onClick={() => setTargetWeek(w.week)} style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                  background: w.week === targetWeek ? 'var(--amber-pencil)' : 'var(--border)',
                  transition: 'background 0.15s',
                }} />
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" disabled={!next} onClick={() => setTargetWeek(next.week)} style={{ opacity: next ? 1 : 0.3 }}>
              {next ? (next.week === 1 ? 'WK 0/1' : `WK ${next.week}`) : ''} ›
            </button>
          </div>
        );
      })()}

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Status alerts */}
      {!weekConfig && <div className="alert alert-warning">THIS WEEK HAS NOT BEEN CONFIGURED YET.</div>}
      {weekConfig && !weekConfig.isOpen && !existingSubmission && <div className="alert alert-info">PICKS ARE NOT OPEN YET.</div>}
      {isPastDeadline && !existingSubmission && <div className="alert alert-warning">DEADLINE HAS PASSED — NO SUBMISSION ON FILE.</div>}

      {/* Locked / Scored views */}
      {existingSubmission?.isScored && <ScoredPicksView submission={existingSubmission} />}
      {existingSubmission && !canEdit && !existingSubmission.isScored && <LockedPicksView submission={existingSubmission} />}

      {/* ── Pick interface ── */}
      {canEdit && (
        <>
          {/* Scoring explainer — compact, one line */}
          <div style={{
            display: 'flex', gap: 16, marginBottom: 14, padding: '8px 12px',
            background: 'var(--elevated)', border: '1px solid var(--border)',
            fontFamily: 'var(--font-scoreboard)', fontSize: 11, letterSpacing: 1,
          }}>
            <span style={{ color: 'var(--text-muted)' }}>TAP A TEAM TO PICK</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ color: 'var(--text-secondary)' }}>WIN vs P4 = 1PT</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ color: 'var(--amber-pencil)' }}>⚡ UPSET LOSS = 2PT</span>
          </div>

          {/* Upset games */}
          {upsetGames.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--amber-pencil)', letterSpacing: 3, marginBottom: 8 }}>
                ⚡ UPSET ELIGIBLE — 2 PTS IF P4 LOSES
              </div>
              {upsetGames.map((g, i) => (
                <GameCard
                  key={g._id || i}
                  game={g}
                  pickedTeam={pickedTeamSet.has(g.homeTeam) ? g.homeTeam : pickedTeamSet.has(g.awayTeam) ? g.awayTeam : null}
                  onPick={handlePick}
                />
              ))}
            </div>
          )}

          {/* P4 vs P4 games */}
          {p4Games.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 8 }}>
                P4 VS P4 — 1 PT FOR WIN
              </div>
              {p4Games.map((g, i) => (
                <GameCard
                  key={g._id || i}
                  game={g}
                  pickedTeam={pickedTeamSet.has(g.homeTeam) ? g.homeTeam : pickedTeamSet.has(g.awayTeam) ? g.awayTeam : null}
                  onPick={handlePick}
                />
              ))}
            </div>
          )}

          {games.length === 0 && (
            <div className="alert alert-info">NO AVAILABLE GAMES — YOU MAY HAVE USED ALL TEAMS PLAYING THIS WEEK.</div>
          )}
        </>
      )}

      {/* ── Sticky bottom bar ── */}
      {canEdit && (
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 50,
          background: 'var(--paper)',
          borderTop: `2px solid ${canSubmit ? 'var(--amber-pencil)' : 'var(--border)'}`,
          boxShadow: '0 -4px 24px rgba(20,18,16,0.14)',
        }}>
          {/* Picks summary row */}
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            padding: '10px 16px 6px',
            overflowX: 'auto',
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          }}>
            {picks.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                flexShrink: 0,
                background: p.pickType === 'upset_loss' ? 'rgba(200,146,42,0.12)' : 'var(--elevated)',
                border: `1px solid ${p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--border)'}`,
                padding: '4px 6px 4px 10px',
                maxWidth: 140,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13,
                    color: 'var(--text-primary)', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{p.team}</div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: p.pickType === 'upset_loss' ? 'var(--amber-pencil)' : 'var(--text-muted)', letterSpacing: 1 }}>
                    {p.pickType === 'upset_loss' ? '⚡ 2PT' : '1PT'}
                  </div>
                </div>
                <button
                  onClick={() => removePick(i)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
                  aria-label={`Remove ${p.team}`}
                >✕</button>
              </div>
            ))}
            {/* Empty slot indicators */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                width: 48, height: 40, flexShrink: 0,
                border: '1.5px dashed var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--text-muted)' }}>
                  {filledSlots + i + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 16px 12px' }}>
            {/* Randy */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={askRandy}
              disabled={askingRandy || isPastDeadline}
              style={{ fontSize: 12, color: randyError ? 'var(--red-pencil)' : 'var(--amber-pencil)', borderColor: 'rgba(200,146,42,0.3)', flexShrink: 0 }}
            >
              {askingRandy ? '🎲...' : randyError ? '⚠ RETRY' : '🎲 RANDY'}
            </button>

            {/* Submit / progress button — full width remaining */}
            <button
              className="btn btn-primary"
              disabled={!canSubmit}
              onClick={() => { setError(''); setShowConfirm(true); }}
              style={{
                flex: 1,
                fontSize: 14,
                opacity: canSubmit ? 1 : 0.5,
                transition: 'opacity 0.15s',
                letterSpacing: 1,
              }}
            >
              {canSubmit
                ? (existingSubmission ? 'UPDATE PICKS →' : 'SUBMIT PICKS →')
                : `PICK ${emptySlots} MORE${emptySlots === 1 ? '' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
