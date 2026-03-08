import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminScoring() {
  const { week } = useParams();
  const weekNum = parseInt(week);
  const weekLabel = weekNum === 1 ? 'Week 0/1' : `Week ${weekNum}`;
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [adjModal, setAdjModal] = useState(null); // { userId, displayName }
  const [adjForm, setAdjForm] = useState({ delta: '', reason: '' });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manualResults, setManualResults] = useState({}); // { gameId: true|false|null }
  const [savingManual, setSavingManual] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/admin/scoring/${weekNum}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [weekNum]);

  const refreshScores = async () => {
    setRefreshing(true);
    setMsg({ text: '', type: '' });
    try {
      const r = await api.post(`/admin/scoring/${weekNum}/refresh`);
      setMsg({ text: `✓ REFRESHED — ${r.data.scoresUpdated} GAME SCORES UPDATED, ${r.data.picksUpdated} SUBMISSIONS PRE-POPULATED`, type: 'success' });
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'REFRESH FAILED', type: 'error' });
    } finally { setRefreshing(false); }
  };

  const overridePick = async (submissionId, pickIndex, result) => {
    try {
      await api.patch(`/admin/scoring/${weekNum}/pick`, { submissionId, pickIndex, result });
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Override failed', type: 'error' });
    }
  };

  const finalize = async () => {
    if (!window.confirm(`Finalize ${weekLabel}? This locks all scores and sends result emails. Cannot be undone.`)) return;
    setFinalizing(true);
    try {
      const r = await api.post(`/admin/scoring/${weekNum}/finalize`);
      const { winners, payout, rollover, biggestUpset } = r.data;
      setMsg({
        text: `✓ ${weekLabel.toUpperCase()} FINALIZED — WINNER: ${winners[0]?.displayName} (${winners[0]?.points}pts)${rollover ? ' · POT ROLLS OVER (3-WAY TIE)' : ` · $${payout} PAYOUT`}${biggestUpset ? ` · BIGGEST UPSET: ${biggestUpset}` : ''}`,
        type: 'success'
      });
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Finalize failed', type: 'error' });
    } finally { setFinalizing(false); }
  };

  const rescore = async () => {
    if (!window.confirm(`Re-score ${weekLabel}? This will re-fetch results from CFBD and recalculate the full season standings.`)) return;
    setRescoring(true);
    try {
      const r = await api.post(`/admin/scoring/${weekNum}/rescore`);
      setMsg({ text: `✓ ${r.data.message}`, type: 'success' });
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Re-score failed', type: 'error' });
    } finally { setRescoring(false); }
  };

  const saveManualResults = async () => {
    const results = Object.entries(manualResults)
      .filter(([, v]) => v !== undefined)
      .map(([gameId, homeWon]) => ({ gameId, homeWon }));
    if (results.length === 0) return setMsg({ text: 'SELECT A WINNER FOR AT LEAST ONE GAME', type: 'error' });
    setSavingManual(true);
    try {
      const r = await api.post(`/admin/scoring/${weekNum}/manual-results`, { results });
      setMsg({ text: `✓ MANUAL RESULTS SAVED — ${r.data.gamesUpdated} GAMES, ${r.data.picksUpdated || 0} PICKS UPDATED`, type: 'success' });
      setShowManual(false);
      setManualResults({});
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'SAVE FAILED', type: 'error' });
    } finally { setSavingManual(false); }
  };

  const submitAdj = async () => {
    if (!adjModal || !adjForm.delta) return;
    try {
      await api.post(`/admin/users/${adjModal.userId}/adjust-points`, {
        week: weekNum,
        delta: parseFloat(adjForm.delta),
        reason: adjForm.reason,
      });
      setMsg({ text: `✓ Adjustment saved for ${adjModal.displayName}`, type: 'success' });
      setAdjModal(null);
      setAdjForm({ delta: '', reason: '' });
      load();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Adjustment failed', type: 'error' });
    }
  };

  if (loading) return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="logo-flash" style={{ fontSize: 28 }}>LOADING...</div>
    </div>
  );

  const { submissions, weekConfig, games, missingPlayers } = data;
  const isFinalized = weekConfig?.isScored;
  const allPending = submissions.every(s => s.picks.every(p => p.result === 'pending'));

  // Sort by points desc
  const sorted = [...submissions].sort((a, b) => b.totalPoints - a.totalPoints);
  const maxPts = sorted[0]?.totalPoints || 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ marginBottom: 8 }}>← BACK</button>
          <h1 className="page-title">{weekLabel.toUpperCase()}<br/>SCORING</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {weekConfig?.isOpen   && <span className="badge badge-amber">OPEN</span>}
            {isFinalized          && <span className="badge badge-green">FINALIZED</span>}
            {!weekConfig          && <span className="badge badge-gray">NOT CONFIGURED</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!isFinalized && <>
            <button className="btn btn-outline" onClick={refreshScores} disabled={refreshing}>
              {refreshing ? 'PULLING SCORES...' : '↻ REFRESH FROM ESPN'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowManual(v => !v)}
              style={{ borderColor: showManual ? 'var(--amber)' : undefined, color: showManual ? 'var(--amber)' : undefined, border: '1px solid var(--border)' }}>
              ✎ ENTER MANUALLY
            </button>
            {!allPending && (
              <button className="btn btn-primary" onClick={finalize} disabled={finalizing}>
                {finalizing ? 'FINALIZING...' : `FINALIZE ${weekLabel.toUpperCase()} →`}
              </button>
            )}
          </>}
          {isFinalized && (
            <button className="btn btn-outline" onClick={rescore} disabled={rescoring} style={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
              {rescoring ? 'RE-SCORING...' : 'RE-SCORE WEEK'}
            </button>
          )}
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {allPending && !isFinalized && (
        <div className="alert alert-warning">
          ALL PICKS ARE STILL PENDING — CLICK "REFRESH FROM ESPN" TO PULL GAME RESULTS. REVIEW THEN FINALIZE.
        </div>
      )}

      {/* Manual game entry panel */}
      {showManual && !isFinalized && (
        <div className="score-card" style={{ marginBottom: 16, borderColor: 'rgba(245,166,35,0.3)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2, color: 'var(--amber)', marginBottom: 4 }}>
            MANUAL GAME RESULTS
          </div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1, marginBottom: 16 }}>
            USE WHEN ESPN/CFBD API IS DOWN · SELECT THE WINNER FOR EACH COMPLETED GAME · THEN SAVE
          </div>

          {(!games || games.length === 0) ? (
            <div className="empty-state"><p>NO GAMES LOADED FOR THIS WEEK</p></div>
          ) : (
            games.map(g => {
              const val = manualResults[g._id];
              return (
                <div key={g._id} style={{ marginBottom: 10, padding: '12px 14px', background: 'var(--elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 8 }}>
                    {g.matchupType === 'p4_vs_p4' ? 'P4 vs P4' : g.matchupType === 'p4_vs_nonp4' ? 'P4 vs Non-P4' : 'Non-P4 vs P4'}
                    {g.gameDate && ` · ${new Date(g.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()}`}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Home team wins */}
                    <button
                      onClick={() => setManualResults(r => ({ ...r, [g._id]: val === true ? undefined : true }))}
                      className={val === true ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                      style={val === true ? {} : { border: '1px solid var(--border)' }}
                    >
                      {g.homeTeam} WINS
                    </button>

                    <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)' }}>vs</span>

                    {/* Away team wins */}
                    <button
                      onClick={() => setManualResults(r => ({ ...r, [g._id]: val === false ? undefined : false }))}
                      className={val === false ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                      style={val === false ? {} : { border: '1px solid var(--border)' }}
                    >
                      {g.awayTeam} WINS
                    </button>

                    {/* Tie (rare but possible) */}
                    <button
                      onClick={() => setManualResults(r => ({ ...r, [g._id]: val === null ? undefined : null }))}
                      className={val === null ? 'btn btn-outline btn-sm' : 'btn btn-ghost btn-sm'}
                      style={{ fontSize: 10, ...(val === null ? { borderColor: 'var(--amber)', color: 'var(--amber)' } : { border: '1px solid var(--border)' }) }}
                    >
                      TIE
                    </button>

                    {val !== undefined && (
                      <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: '#4ab870', letterSpacing: 1 }}>✓ SET</span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowManual(false); setManualResults({}); }}>CANCEL</button>
            <button className="btn btn-primary" onClick={saveManualResults} disabled={savingManual || Object.keys(manualResults).length === 0}>
              {savingManual ? 'SAVING...' : `SAVE ${Object.keys(manualResults).filter(k => manualResults[k] !== undefined).length} RESULT${Object.keys(manualResults).filter(k => manualResults[k] !== undefined).length !== 1 ? 'S' : ''} & SCORE PICKS`}
            </button>
          </div>
        </div>
      )}

      {/* Missing players */}
      {missingPlayers?.length > 0 && (
        <div className="alert alert-info">
          ⚠ {missingPlayers.length} PLAYER{missingPlayers.length > 1 ? 'S' : ''} DID NOT SUBMIT:{' '}
          {missingPlayers.map(p => p.displayName).join(', ')}
        </div>
      )}

      {/* Submissions */}
      <div style={{ marginTop: 8 }}>
        {sorted.map((sub) => {
          const isExpanded = expandedPlayer === sub._id;
          const isWinner = sub.totalPoints === maxPts && isFinalized;

          return (
            <div
              key={sub._id}
              className={`score-card ${isWinner ? 'gold' : ''}`}
              style={{ marginBottom: 10, padding: 0, overflow: 'hidden' }}
            >
              {/* Row header */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: 'pointer' }}
                onClick={() => setExpandedPlayer(isExpanded ? null : sub._id)}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: isWinner ? 'var(--amber)' : 'var(--green-text)', width: 44, flexShrink: 0 }}>
                  {sub.weekRank || '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 17, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {sub.user.displayName}
                    {sub.wasRandyd  && <span className="badge badge-red"  style={{ fontSize: 9 }}>RANDY'D</span>}
                    {isFinalized && isWinner && <span className="badge badge-amber" style={{ fontSize: 9 }}>WINNER</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 1 }}>
                    @{sub.user.username} · {sub.picks.filter(p => p.result === 'correct').length}/{sub.picks.length} CORRECT
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setAdjModal({ userId: sub.user._id, displayName: sub.user.displayName }); setAdjForm({ delta: '', reason: '' }); }}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 9, letterSpacing: 1, padding: '3px 8px' }}
                  >ADJ</button>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: isWinner ? 'var(--amber)' : 'var(--cream)', lineHeight: 1 }}>
                      {sub.totalPoints}
                    </div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 9, color: 'var(--green-text)', letterSpacing: 2 }}>PTS</div>
                  </div>
                </div>
                <div style={{ color: 'var(--green-text)', fontSize: 14 }}>{isExpanded ? '▲' : '▼'}</div>
              </div>

              {/* Expanded picks */}
              {isExpanded && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)' }}>
                  {sub.picks.map((pick, i) => (
                    <div key={i} className={`pick-slot ${pick.result}`} style={{ marginTop: 8 }}>
                      <div className="pick-num">{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div className="pick-team-name">{pick.team}</div>
                        <div className="pick-type-tag">
                          {pick.pickType === 'win_vs_power4' ? 'WIN VS P4 · 1PT' : 'UPSET LOSS · 2PTS'}
                        </div>
                      </div>

                      {/* Override buttons (only if not finalized) */}
                      {!isFinalized && (
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          {['correct', 'incorrect', 'pending'].map(r => (
                            <button
                              key={r}
                              className={`btn btn-sm ${pick.result === r ? (r === 'correct' ? 'btn-primary' : r === 'incorrect' ? 'btn-danger' : 'btn-outline') : 'btn-ghost'}`}
                              style={{ fontSize: 10, letterSpacing: 0.5, padding: '4px 8px' }}
                              onClick={() => overridePick(sub._id, i, r)}
                            >
                              {r.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Points display */}
                      {isFinalized && (
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: pick.result === 'correct' ? '#4ab870' : 'var(--red-score)', flexShrink: 0 }}>
                          {pick.pointsEarned}pt
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {submissions.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>NO SUBMISSIONS YET FOR {weekLabel.toUpperCase()}</p>
        </div>
      )}

      {/* Commissioner Adjustment Modal */}
      {adjModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="score-card" style={{ width: '100%', maxWidth: 380 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, marginBottom: 4 }}>COMMISSIONER ADJUSTMENT</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1, marginBottom: 16 }}>
              {adjModal.displayName.toUpperCase()} · {weekLabel.toUpperCase()}
            </div>
            <div className="form-group">
              <label className="form-label">POINT DELTA (e.g. +1 or -0.5)</label>
              <input className="form-input" type="number" step="0.5" placeholder="e.g. 1 or -1"
                value={adjForm.delta} onChange={e => setAdjForm(f => ({ ...f, delta: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">REASON (shown in player history)</label>
              <input className="form-input" type="text" placeholder="e.g. Scoring error correction"
                value={adjForm.reason} onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={submitAdj} disabled={!adjForm.delta}>SAVE ADJUSTMENT</button>
              <button className="btn btn-ghost" onClick={() => setAdjModal(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}