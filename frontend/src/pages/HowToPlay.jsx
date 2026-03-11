import { Link } from 'react-router-dom';

const rule = (icon, title, body) => (
  <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--amber)', flexShrink: 0, width: 36, textAlign: 'center', lineHeight: 1.2 }}>{icon}</div>
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2, marginBottom: 4 }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--text-secondary)', letterSpacing: 0.5, lineHeight: 1.7 }}>{body}</div>
    </div>
  </div>
);

export default function HowToPlay() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 60px' }}>

      {/* Header */}
      <div style={{ background: 'var(--green-dark)', borderBottom: '4px solid var(--amber)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 4, color: 'var(--amber)' }}>68 SKI-DOO</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 3, marginTop: 2 }}>
            2026 COLLEGE FOOTBALL PICK'EM
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/leaderboard" style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, alignSelf: 'center' }}>STANDINGS</Link>
          <Link to="/login" className="btn btn-primary btn-sm">SIGN IN →</Link>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, letterSpacing: 4, color: 'var(--amber)', lineHeight: 1.1, marginBottom: 12 }}>
            HOW TO PLAY
          </div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--text-secondary)', letterSpacing: 2, lineHeight: 1.8 }}>
            68 TEAMS. 14 WEEKS. ONE CHAMPION.<br />
            THE PICK'EM LEAGUE WITH A TWIST.
          </div>
        </div>

        {/* The concept */}
        <div className="score-card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: 'var(--amber)', marginBottom: 16 }}>THE BASICS</div>
          {rule('◎', 'PICK YOUR TEAMS EACH WEEK', 'Every week you pick 4–5 college football teams. Each team can only be used once all season across all 14 weeks — so choose wisely. With 68 eligible teams and 68 total picks over the season, every team gets used exactly once.')}
          {rule('1', 'WIN PICK = 1 POINT', 'Pick a Power 4 team (ACC, Big Ten, Big 12, SEC, or Notre Dame) to beat another Power 4 team. If they win, you get 1 point. Simple.')}
          {rule('⚡', 'UPSET PICK = 2 POINTS', 'Here\'s where it gets interesting. Pick a Power 4 team to LOSE to a non-Power 4 opponent. If the upset happens, you score 2 points. High risk, high reward — and it rewards people who actually follow the sport.')}
        </div>

        {/* The strategy */}
        <div className="score-card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: 'var(--amber)', marginBottom: 16 }}>THE STRATEGY</div>
          {rule('🗓', 'TEAM MANAGEMENT IS EVERYTHING', 'You have exactly 68 teams and 68 picks. Save your best teams for when they have cupcake opponents. Don\'t burn Ohio State in Week 1 if they play Michigan in Week 14.')}
          {rule('🎯', 'TIMING YOUR UPSETS', 'Upset picks are where seasons are won and lost. A 2-point week can swing the standings dramatically. But betting on too many upsets and missing them will bury you.')}
          {rule('🎲', "DON'T MISS THE DEADLINE", 'Picks are due by Friday noon each week. Thursday games have an earlier deadline — those picks must be in by Thursday noon. Miss the deadline and Randy the Randomizer picks for you. Randy is not strategic. Randy does not care about your season.')}
        </div>

        {/* The money */}
        <div className="score-card" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: 'var(--amber)', marginBottom: 16 }}>THE STAKES</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              ['$70', 'ENTRY FEE'],
              ['$70', 'WEEKLY POT'],
              ['70%', 'SEASON WINNER'],
              ['$70', 'LAST PLACE'],
            ].map(([val, label]) => (
              <div key={label} style={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--amber)', lineHeight: 1 }}>{val}</div>
                <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--green-text)', letterSpacing: 2, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--text-secondary)', letterSpacing: 0.5, lineHeight: 1.8 }}>
            Each week has its own $70 pot — winner takes it. Season-end payouts go 70/20/10% to the top 3. And yes, last place gets their $70 back as a consolation prize. Lose with dignity.
          </div>
        </div>

        {/* Weekly flow */}
        <div className="score-card" style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 3, color: 'var(--amber)', marginBottom: 16 }}>WEEK IN THE LIFE</div>
          {[
            ['MON–WED', 'Browse the week\'s games, plan your picks, check which teams you\'ve already used.'],
            ['FRIDAY NOON', 'Main deadline. Submit all picks before then or Randy picks for you.'],
            ['THURSDAY NOON', 'Earlier deadline for Thursday night games only. Other picks still editable until Friday.'],
            ['SAT–SUN', 'Watch games, track results live. Check the Pick Reveal to see what everyone else picked.'],
            ['SUNDAY NIGHT', 'Scores are finalized. Standings update. Weekly winner gets paid.'],
          ].map(([day, desc]) => (
            <div key={day} style={{ display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber)', letterSpacing: 2, flexShrink: 0, width: 110, paddingTop: 2 }}>{day}</div>
              <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--text-secondary)', letterSpacing: 0.5, lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 16, marginBottom: 0 }}>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 13, color: 'var(--amber)', letterSpacing: 2, flexShrink: 0, width: 110, paddingTop: 2 }}>WEEK 14</div>
            <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--text-secondary)', letterSpacing: 0.5, lineHeight: 1.7 }}>Season ends. Champion crowned. Trophies distributed. Grudges formed.</div>
          </div>
        </div>

        {/* CTA */}
        <div className="score-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: 3, marginBottom: 8 }}>READY TO PLAY?</div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 14, color: 'var(--green-text)', letterSpacing: 2, marginBottom: 8 }}>
            THIS IS AN INVITE-ONLY LEAGUE.
          </div>
          <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: 15, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 24, lineHeight: 1.8 }}>
            EMAIL THE COMMISSIONER TO GET ON THE LIST:<br />
            <a href="mailto:skidoobot@gmail.com" style={{ color: 'var(--amber)', letterSpacing: 2 }}>SKIDOOBOT@GMAIL.COM</a>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="btn btn-primary">SIGN IN →</Link>
            <Link to="/leaderboard" className="btn btn-ghost">VIEW STANDINGS</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
