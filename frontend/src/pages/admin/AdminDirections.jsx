export default function AdminDirections() {
  const Step = ({ num, title, when, children }) => (
    <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: 'var(--elevated)', border: '2px solid var(--amber-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--amber)' }}>
        {num}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: 2, color: 'var(--amber)', marginBottom: 2 }}>{title}</div>
        {when && <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 8 }}>{when}</div>}
        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, color: 'var(--cream-dim)', lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );

  const Divider = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 24px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color: 'var(--green-text)', letterSpacing: 3, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );

  const Tag = ({ children, color = 'var(--amber)' }) => (
    <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 10, color, background: `${color}18`, border: `1px solid ${color}55`, borderRadius: 4, padding: '2px 7px', letterSpacing: 1, marginRight: 6 }}>
      {children}
    </span>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">COMMISSIONER<br/>PLAYBOOK</h1>
        <div className="page-subtitle">WEEKLY WORKFLOW · 68 SKI-DOO 2025</div>
      </div>

      {/* Season setup — one time */}
      <div className="score-card" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: 'var(--amber)', marginBottom: 20 }}>
          ONE-TIME SETUP
        </div>

        <Step num="①" title="CONFIGURE ALL 14 WEEKS" when="BEFORE SEASON OPENS">
          Go to <Tag>MANAGE WEEKS</Tag> and click <Tag>AUTO-SETUP ALL</Tag>. This pre-fills Friday noon deadlines for all 14 weeks. Thursday games have their own per-game deadline of Thursday noon — the system enforces this automatically. You can edit individual week deadlines after setup if needed.
        </Step>

        <Step num="②" title="INVITE YOUR PLAYERS" when="BEFORE SEASON OPENS">
          Go to <Tag>INVITES</Tag> and create an invite for each player — enter their email and the system sends them a link automatically. Or create a generic link and text it to them. Players must verify their email before they can submit picks.
        </Step>

        <Step num="③" title="MARK EVERYONE PAID" when="AFTER COLLECTING $70/PLAYER">
          Go to <Tag>PLAYERS</Tag> and toggle <Tag color="#4ab870">MARK PAID</Tag> for each player after you collect their entry fee. This is just for your own tracking — it doesn't affect their ability to play.
        </Step>
      </div>

      {/* Weekly workflow */}
      <div className="score-card" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: 'var(--amber)', marginBottom: 20 }}>
          EVERY WEEK
        </div>

        <Divider label="MONDAY OR TUESDAY" />

        <Step num="1" title="OPEN THE WEEK" when="MONDAY — AFTER PREVIOUS WEEK IS FINALIZED">
          Go to <Tag>MANAGE WEEKS</Tag> → find the current week → click <Tag>OPEN</Tag>. This sends an email to all verified players that picks are open. The Friday noon deadline is already configured — you don't need to do anything else. Randy will auto-assign picks for anyone who misses the deadline.
        </Step>

        <Divider label="FRIDAY NOON — AUTOMATIC" />

        <Step num="2" title="DEADLINE HITS — RANDY FIRES & WEEK CLOSES" when="FRIDAY 12:00 PM — AUTOMATIC">
          You don't need to do anything. At Friday noon the week closes automatically — no manual action required. Randy assigns picks for any player who hasn't submitted, respecting their remaining teams and trying to include at least one upset pick. Players get an email if they were Randy'd. A 12-hour reminder email also goes out automatically. The manual <Tag>CLOSE WEEK</Tag> button in Manage Weeks exists only if you ever need to close early.
        </Step>

        <Divider label="SUNDAY" />

        <Step num="3" title="PULL GAME SCORES" when="SUNDAY AFTERNOON — AFTER GAMES FINISH">
          Go to <Tag>SCORING</Tag> for the current week → click <Tag>↻ REFRESH FROM ESPN</Tag>. This pulls completed game scores from the CFBD API and pre-populates correct/incorrect on every pick. Review the results — expand each player to check their picks look right.
        </Step>

        <Step num="4" title="REVIEW & OVERRIDE IF NEEDED" when="SUNDAY — BEFORE FINALIZING">
          Scan each player's picks in the scoring panel. If any result looks wrong (e.g. a game that ended in an unusual way), you can manually toggle a pick between <Tag color="#4ab870">CORRECT</Tag> <Tag color="#e05c5c">INCORRECT</Tag> <Tag>PENDING</Tag>. This is rare — CFBD data is usually accurate.
        </Step>

        <Step num="5" title="FINALIZE THE WEEK" when="SUNDAY EVENING">
          Click <Tag>FINALIZE WEEK →</Tag>. This locks all scores, calculates the weekly winner, handles pot rollover if there's a 3-way tie, updates the season leaderboard, and emails results to all players. <strong style={{ color: 'var(--cream)' }}>This cannot be undone</strong> — double-check picks before finalizing.
        </Step>

        <Divider label="AFTER FINALIZE" />

        <Step num="6" title="WEEKLY POT PAYOUT" when="AFTER FINALIZING — MANUAL">
          The app tracks the winner but doesn't handle money. After finalizing, check the results email or scoring panel to see who won the $70 weekly pot. In a 2-way tie, split $35/$35. In a 3+ way tie, the pot rolls over and adds to next week. The app tracks the rollover total internally.
        </Step>
      </div>

      {/* Season end */}
      <div className="score-card" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: 'var(--amber)', marginBottom: 20 }}>
          END OF SEASON
        </div>

        <Step num="★" title="SEASON PAYOUTS" when="AFTER WEEK 14 IS FINALIZED">
          The leaderboard shows final season standings. Payouts are manual — the app shows you who finished where:
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { place: '1ST PLACE', pct: '70%', desc: 'of season pot' },
              { place: '2ND PLACE', pct: '20%', desc: 'of season pot' },
              { place: '3RD PLACE', pct: '10%', desc: 'of season pot' },
              { place: 'LAST PLACE', pct: '$70', desc: 'consolation prize' },
            ].map(({ place, pct, desc }) => (
              <div key={place} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--amber)', width: 100 }}>{place}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--cream)', width: 60 }}>{pct}</span>
                <span style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 11, color: 'var(--green-text)', letterSpacing: 1 }}>{desc}</span>
              </div>
            ))}
          </div>
        </Step>
      </div>

      {/* Corrections & overrides */}
      <div className="score-card" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: 'var(--amber)', marginBottom: 20 }}>
          CORRECTIONS & OVERRIDES
        </div>

        <Step num="⚠" title="RE-SCORE A FINALIZED WEEK" when="IF A SCORING ERROR IS FOUND AFTER FINALIZE">
          Go to <Tag>SCORING</Tag> for that week. You'll see a red <Tag color="#e05c5c">⚠ RE-SCORE WEEK</Tag> button. Click it — the system re-fetches scores from CFBD, recalculates all picks, and rebuilds the full season standings from scratch. No emails are sent. Double-check standings afterward on the Leaderboard.
        </Step>

        <Step num="⚑" title="MANUAL POINT ADJUSTMENT" when="IF A PICK NEEDS A CUSTOM CORRECTION">
          Go to <Tag>SCORING</Tag> for the relevant week → click <Tag>ADJ</Tag> next to any player → enter a delta (positive or negative, supports 0.5) and a reason. The adjustment is visible to the player in their pick history as a "Commissioner Adjustment" line item. Use sparingly.
        </Step>

        <Step num="✉" title="RESET A PLAYER'S EMAIL" when="IF A PLAYER LOSES ACCOUNT ACCESS">
          Go to <Tag>PLAYERS</Tag> → find the player → click <Tag>RESET EMAIL</Tag> → enter their new address. Their account is flagged as unverified and they'll receive a new verification email. They cannot log in until they verify.
        </Step>
      </div>

            {/* Quick reference */}
      <div className="score-card">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: 'var(--amber)', marginBottom: 16 }}>
          QUICK REFERENCE
        </div>
        {[
          { q: 'Someone missed the deadline', a: 'Randy handled it automatically. Check the scoring panel to see what they were assigned.' },
          { q: 'A player wants to join mid-season', a: 'Go to Invites → create a link for them. They can join but only start picking from the current week forward. Their used-team list starts empty.' },
          { q: 'A game result looks wrong before finalizing', a: 'Use the override buttons in the Scoring panel before finalizing. You can toggle any pick to correct/incorrect manually.' },
          { q: 'You already finalized but a score was wrong', a: 'Go to Scoring → click RE-SCORE WEEK (red button, bottom right). This re-fetches scores from CFBD and recalculates the full season standings from scratch. Silent — no emails sent.' },
          { q: "Need to manually adjust a player's points", a: 'Go to Scoring → click ADJ next to the player → enter a point delta (e.g. +1 or -0.5) and a reason. The adjustment shows in their history as a Commissioner Adjustment line item.' },
          { q: 'A player lost access to their email', a: 'Go to Players → find them → click RESET EMAIL → enter their new address. They will need to re-verify.' },
          { q: '2-way tie for the weekly pot', a: 'The app splits the pot evenly ($35/$35). Handled automatically at finalize.' },
          { q: 'Tiebreaker for season standings', a: 'Player with more total upset picks made wins. This is calculated automatically.' },
          { q: 'Forgot to open a week', a: 'Open it late — players can still submit until the deadline. Randy fires at the deadline regardless of when you opened it.' },
          { q: 'A player is locked out of their account', a: 'Go to Players → find them → make sure their account is Active. Email verification issues can also block login.' },
          { q: 'The CFBD refresh returns no scores', a: 'Games may not be final yet. Try again Sunday evening. Bowl games and conference championships may need Monday.' },
          { q: '3-way tie for the week', a: 'The app automatically rolls the $70 pot to next week and tracks the cumulative rollover amount internally.' },
        ].map(({ q, a }) => (
          <div key={q} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15, color: 'var(--cream)', marginBottom: 4 }}>
              Q: {q}
            </div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--cream-dim)', lineHeight: 1.5 }}>
              → {a}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
