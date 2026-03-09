const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const from = () =>
  `"${process.env.EMAIL_FROM_NAME || '68 Ski-Doo'}" <${process.env.EMAIL_FROM_ADDRESS}>`;

const BASE_STYLE = `
  font-family: Georgia, 'Times New Roman', serif;
  background: #f5f2eb;
  color: #141210;
  max-width: 600px;
  margin: 0 auto;
  padding: 0;
`;

const htmlWrap = (title, body) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#e9e4d8;">
  <div style="${BASE_STYLE}">
    <!-- Header -->
    <div style="background:#141210;padding:28px 32px;">
      <div style="font-family:Georgia,serif;font-size:34px;font-weight:900;letter-spacing:2px;color:#f5f2eb;">
        68 Ski-Doo
      </div>
      <div style="font-family:'Courier New',monospace;font-size:11px;color:#a89e8a;margin-top:5px;letter-spacing:2px;text-transform:uppercase;">
        2026 College Football Pick'em
      </div>
    </div>
    <!-- Body -->
    <div style="padding:32px;background:#f5f2eb;border-left:1px solid #ddd8cc;border-right:1px solid #ddd8cc;">
      <h2 style="color:#141210;font-family:Georgia,serif;letter-spacing:1px;margin:0 0 20px;font-size:22px;font-weight:900;border-bottom:2px solid #141210;padding-bottom:10px;">
        ${title}
      </h2>
      ${body}
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;background:#e9e4d8;border-top:1px solid #ddd8cc;font-family:'Courier New',monospace;font-size:10px;color:#6a6050;letter-spacing:1px;text-transform:uppercase;">
      68 Ski-Doo · 2026 Season · murphdunks.com
    </div>
  </div>
</body>
</html>`;

const p = (text) =>
  `<p style="color:#242018;line-height:1.75;margin:0 0 16px;font-size:14px;font-family:Georgia,serif;">${text}</p>`;

const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:#141210;color:#f5f2eb;padding:13px 26px;text-decoration:none;font-weight:700;letter-spacing:1px;font-size:13px;margin:8px 0;font-family:'Courier New',monospace;">${text}</a>`;

const divider = () =>
  `<div style="border-top:1px solid rgba(20,18,16,0.15);margin:20px 0;"></div>`;

// ── EMAIL TEMPLATES ────────────────────────────────────────────────────────────

const sendVerificationEmail = async (email, displayName, token) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: '68 Ski-Doo — Verify Your Email',
    html: htmlWrap('VERIFY YOUR EMAIL', `
      ${p(`Welcome to 68 Ski-Doo, <strong style="color:#b7770d;">${displayName}</strong>!`)}
      ${p('Click the button below to verify your email and activate your account. This link expires in 24 hours.')}
      ${btn('VERIFY EMAIL →', url)}
      ${divider()}
      ${p(`Or copy this link: <span style="color:#5a4a30;">${url}</span>`)}
    `)
  });
};

const sendInviteEmail = async (email, inviterName, token, expiresInDays) => {
  const url = `${process.env.FRONTEND_URL}/register?invite=${token}`;
  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: `${inviterName} invited you to join 68 Ski-Doo 2026`,
    html: htmlWrap("YOU'VE BEEN INVITED", `
      ${p(`<strong style="color:#b7770d;">${inviterName}</strong> has invited you to join the 68 Ski-Doo 2026 college football pick'em league.`)}
      ${p('$70 entry. 14 weeks. 68 teams. One champion.')}
      ${btn('ACCEPT INVITE →', url)}
      ${divider()}
      ${p(`This invite expires in <strong style="color:#b7770d;">${expiresInDays} days</strong>.`)}
      ${p(`Link: <span style="color:#5a4a30;">${url}</span>`)}
    `)
  });
};

const sendPicksOpenEmail = async (email, displayName, weekLabel, deadline, games = []) => {
  const url = `${process.env.FRONTEND_URL}/picks`;
  const deadlineStr = new Date(deadline).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });

  const p4Games = games.filter(g => g.matchupType === 'p4_vs_p4');
  const upsetGames = games.filter(g => g.matchupType !== 'p4_vs_p4');

  const gameRow = (g) => {
    const home = g.homeTeam || 'TBD';
    const away = g.awayTeam || 'TBD';
    const gameDate = g.gameDate ? new Date(g.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
    return `<tr>
      <td style="padding:5px 10px;color:#3d3020;font-size:12px;">${away}</td>
      <td style="padding:5px 4px;color:#5a4a30;font-size:11px;text-align:center;">@</td>
      <td style="padding:5px 10px;color:#3d3020;font-size:12px;">${home}</td>
      <td style="padding:5px 10px;color:#5a4a30;font-size:10px;text-align:right;">${gameDate}</td>
    </tr>`;
  };

  const gamesSection = games.length > 0 ? `
    ${divider()}
    ${p4Games.length > 0 ? `
      <div style="font-size:11px;letter-spacing:3px;color:#5a4a30;margin-bottom:8px;font-family:'Courier New',monospace;">P4 GAMES · WIN PICK = 1PT</div>
      <table style="width:100%;border-collapse:collapse;font-family:'Courier New',monospace;margin-bottom:16px;">
        <tbody>${p4Games.map(gameRow).join('')}</tbody>
      </table>` : ''}
    ${upsetGames.length > 0 ? `
      <div style="font-size:11px;letter-spacing:3px;color:#b7770d;margin-bottom:8px;font-family:'Courier New',monospace;">⚡ UPSET OPPORTUNITIES · UPSET LOSS PICK = 2PTS</div>
      <table style="width:100%;border-collapse:collapse;font-family:'Courier New',monospace;">
        <tbody>${upsetGames.map(gameRow).join('')}</tbody>
      </table>` : ''}
  ` : '';

  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: `68 Ski-Doo — ${weekLabel} picks are open`,
    html: htmlWrap(`${weekLabel.toUpperCase()} PICKS ARE OPEN`, `
      ${p(`Hey <strong style="color:#2a2118;">${displayName}</strong> — time to make your picks.`)}
      ${p(`Deadline: <strong style="color:#c0392b;">${deadlineStr}</strong>`)}
      ${btn('Submit Your Picks →', url)}
      ${p(`<span style="font-size:12px;color:#8a7a5a;">👆 That button takes you straight to the picks page. If it doesn't work, go to: <a href="${url}" style="color:#2471a3;">${url}</a></span>`)}
      ${gamesSection}
    `)
  });
};

const sendDeadlineReminderEmail = async (email, displayName, weekLabel, deadline) => {
  const url = `${process.env.FRONTEND_URL}/picks`;
  const deadlineStr = new Date(deadline).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  });
  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: `⏰ 68 Ski-Doo — 12 hours left to submit ${weekLabel} picks`,
    html: htmlWrap('DEADLINE REMINDER', `
      ${p(`<strong style="color:#b7770d;">${displayName}</strong> — you haven't submitted your ${weekLabel} picks yet.`)}
      ${p(`Deadline: <strong style="color:#b7770d;">${deadlineStr} today</strong>`)}
      ${p("If you don't submit, Randy the Randomizer will pick for you.")}
      ${btn('SUBMIT PICKS NOW →', url)}
    `)
  });
};

const sendRandyEmail = async (email, displayName, weekLabel, picks) => {
  const pickList = picks.map((p, i) =>
    `<div style="padding:8px 12px;background:#e8e0c6;margin:4px 0;border-left:3px solid #b7770d;font-size:13px;color:#3d3020;">
      ${i + 1}. ${p.team} — ${p.pickType === 'win_vs_power4' ? 'WIN vs P4 (1pt)' : 'UPSET LOSS (2pts)'}
    </div>`
  ).join('');

  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: `🎲 68 Ski-Doo — Randy picked your ${weekLabel} picks`,
    html: htmlWrap('RANDY HAS SPOKEN', `
      ${p(`<strong style="color:#b7770d;">${displayName}</strong> — you didn't submit your ${weekLabel} picks before the deadline, so Randy the Randomizer stepped in.`)}
      ${p('Here are your auto-assigned picks:')}
      ${pickList}
      ${divider()}
      ${p('Better luck next week. Set a reminder.')}
    `)
  });
};

const sendResultsEmail = async (email, displayName, weekLabel, totalPoints, weekRank, seasonRank, standings = []) => {
  const url = `${process.env.FRONTEND_URL}/leaderboard`;
  const standingsRows = standings.slice(0, 15).map((p, i) => {
    const isMe = p.displayName === displayName;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const weekPtsCell = p.weekPoints !== null && p.weekPoints !== undefined
      ? `<span style="color:#5a4a30;">${p.weekPoints}</span>`
      : `<span style="color:#3a5a44;">—</span>`;
    return `<tr style="background:${isMe ? 'rgba(245,166,35,0.08)' : i % 2 === 0 ? '#0d2b1d' : '#112218'};">
      <td style="padding:7px 10px;color:#5a4a30;font-size:12px;width:28px;">${medal}</td>
      <td style="padding:7px 10px;color:${isMe ? '#f5a623' : '#d4c9a8'};font-size:13px;font-weight:${isMe ? '700' : '400'};">
        ${p.displayName}${isMe ? ' ◄' : ''}
      </td>
      <td style="padding:7px 10px;color:#5a4a30;font-size:13px;text-align:right;font-family:'Courier New',monospace;">
        ${weekPtsCell}
      </td>
      <td style="padding:7px 10px;color:#b7770d;font-size:14px;font-weight:900;text-align:right;font-family:'Courier New',monospace;">
        ${p.seasonPoints}
      </td>
    </tr>`;
  }).join('');

  const standingsTable = standings.length > 0 ? `
    <div style="margin:20px 0;">
      <div style="font-size:12px;letter-spacing:3px;color:#5a4a30;margin-bottom:10px;font-family:'Courier New',monospace;">SEASON STANDINGS</div>
      <table style="width:100%;border-collapse:collapse;font-family:'Courier New',monospace;">
        <thead>
          <tr style="background:#0a1f13;border-bottom:2px solid #f5a623;">
            <th style="padding:6px 10px;color:#5a4a30;font-size:10px;letter-spacing:2px;text-align:left;">#</th>
            <th style="padding:6px 10px;color:#5a4a30;font-size:10px;letter-spacing:2px;text-align:left;">PLAYER</th>
            <th style="padding:6px 10px;color:#5a4a30;font-size:10px;letter-spacing:2px;text-align:right;">WK</th>
            <th style="padding:6px 10px;color:#5a4a30;font-size:10px;letter-spacing:2px;text-align:right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>${standingsRows}</tbody>
      </table>
      ${standings.length > 15 ? `<div style="font-size:11px;color:#8a7a5a;margin-top:6px;text-align:right;">+${standings.length - 15} more players</div>` : ''}
    </div>` : '';

  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: `68 Ski-Doo — ${weekLabel} results are in`,
    html: htmlWrap(`${weekLabel.toUpperCase()} RESULTS`, `
      ${p(`<strong style="color:#b7770d;">${displayName}</strong> — the scores are in.`)}
      <div style="background:#e8e0c6;padding:20px;margin:16px 0;border:1px solid #1e3d2a;">
        <div style="font-size:48px;font-weight:900;color:#b7770d;font-family:'Courier New',monospace;line-height:1;">
          ${totalPoints} PTS
        </div>
        <div style="font-size:12px;letter-spacing:2px;color:#5a4a30;margin-top:4px;">THIS WEEK</div>
        <div style="margin-top:16px;font-size:14px;color:#3d3020;">
          Week rank: <strong style="color:#b7770d;">#${weekRank}</strong> &nbsp;·&nbsp;
          Season rank: <strong style="color:#b7770d;">#${seasonRank}</strong>
        </div>
      </div>
      ${standingsTable}
      ${btn('VIEW FULL LEADERBOARD →', url)}
    `)
  });
};


const sendThursdayWarningEmail = async (email, displayName, weekLabel, thursdayTeams, thursdayNoon) => {
  const deadlineStr = new Date(thursdayNoon).toLocaleTimeString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  const teamList = thursdayTeams.map(t => `<li style="margin-bottom:6px;font-family:monospace;color:#b7770d;">${t}</li>`).join('');

  await transporter.sendMail({
    from: '"68 Ski-Doo" <skidoobot@gmail.com>',
    to: email,
    subject: `[68 Ski-Doo] Thursday pick deadline: ${deadlineStr}`,
    html: `
      ${emailBase(`
        ${h2('THURSDAY DEADLINE WARNING')}
        ${p(`Hey ${displayName} — you have picks involving Thursday night games this ${weekLabel}.`)}
        ${p(`<strong style="color:#b7770d;">These picks must be submitted by ${deadlineStr}</strong> — the Thursday game lock is separate from the Friday noon deadline.`)}
        <ul style="padding-left:20px;margin:12px 0;">${teamList}</ul>
        ${p('Your other picks can still be updated until Friday noon.')}
        <div style="text-align:center;margin-top:24px;">
          <a href="${process.env.FRONTEND_URL || 'https://skidoo.murphdunks.com'}/picks" style="background:#f5a623;color:#0d1f0d;padding:12px 28px;border-radius:4px;text-decoration:none;font-family:monospace;font-weight:700;letter-spacing:2px;">SUBMIT PICKS NOW</a>
        </div>
      `)}
    `,
  });
};

const sendPasswordResetEmail = async (email, displayName, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: '68 Ski-Doo — Reset Your Password',
    html: htmlWrap('RESET YOUR PASSWORD', `
      ${p(`Hey <strong style="color:#b7770d;">${displayName}</strong> — we got a request to reset your password.`)}
      ${p('Click the button below. This link expires in <strong style="color:#b7770d;">1 hour</strong>.')}
      ${btn('RESET PASSWORD →', url)}
      ${divider()}
      ${p('If you didn\'t request this, ignore this email. Your password won\'t change.')}
      ${p(`Or copy this link: <span style="color:#5a4a30;">${url}</span>`)}
    `)
  });
};

module.exports = {
  sendThursdayWarningEmail,
  sendVerificationEmail,
  sendInviteEmail,
  sendPicksOpenEmail,
  sendDeadlineReminderEmail,
  sendRandyEmail,
  sendResultsEmail,
  sendPasswordResetEmail,
};
