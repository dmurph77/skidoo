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
  font-family: 'Courier New', monospace;
  background: #0d2b1d;
  color: #f0e6c8;
  max-width: 600px;
  margin: 0 auto;
  padding: 0;
`;

const htmlWrap = (title, body) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#1a1a1a;">
  <div style="${BASE_STYLE}">
    <!-- Header -->
    <div style="background:#0d2b1d;border-bottom:4px solid #f5a623;padding:24px 32px;">
      <div style="font-size:36px;font-weight:900;letter-spacing:4px;color:#f5a623;font-family:'Courier New',monospace;">
        68 SKI-DOO
      </div>
      <div style="font-size:11px;letter-spacing:3px;color:#8bb89a;margin-top:4px;">
        2026 COLLEGE FOOTBALL PICK'EM
      </div>
    </div>
    <!-- Body -->
    <div style="padding:32px;background:#112218;">
      <h2 style="color:#f5a623;font-family:'Courier New',monospace;letter-spacing:2px;margin:0 0 20px;font-size:20px;">
        ${title}
      </h2>
      ${body}
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;background:#0d2b1d;border-top:2px solid #1e3d2a;font-size:11px;color:#5a7a64;letter-spacing:1px;">
      68 SKI-DOO · 2026 SEASON · murphdunks.com
    </div>
  </div>
</body>
</html>`;

const p = (text) =>
  `<p style="color:#d4c9a8;line-height:1.7;margin:0 0 16px;font-size:14px;">${text}</p>`;

const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:#f5a623;color:#0d2b1d;padding:14px 28px;text-decoration:none;font-weight:900;letter-spacing:2px;font-size:13px;margin:8px 0;font-family:'Courier New',monospace;">${text}</a>`;

const divider = () =>
  `<div style="border-top:1px solid #1e3d2a;margin:20px 0;"></div>`;

// ── EMAIL TEMPLATES ────────────────────────────────────────────────────────────

const sendVerificationEmail = async (email, displayName, token) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: '68 Ski-Doo — Verify Your Email',
    html: htmlWrap('VERIFY YOUR EMAIL', `
      ${p(`Welcome to 68 Ski-Doo, <strong style="color:#f5a623;">${displayName}</strong>!`)}
      ${p('Click the button below to verify your email and activate your account. This link expires in 24 hours.')}
      ${btn('VERIFY EMAIL →', url)}
      ${divider()}
      ${p(`Or copy this link: <span style="color:#8bb89a;">${url}</span>`)}
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
      ${p(`<strong style="color:#f5a623;">${inviterName}</strong> has invited you to join the 68 Ski-Doo 2026 college football pick'em league.`)}
      ${p('$70 entry. 14 weeks. 68 teams. One champion.')}
      ${btn('ACCEPT INVITE →', url)}
      ${divider()}
      ${p(`This invite expires in <strong style="color:#f5a623;">${expiresInDays} days</strong>.`)}
      ${p(`Link: <span style="color:#8bb89a;">${url}</span>`)}
    `)
  });
};

const sendPicksOpenEmail = async (email, displayName, weekLabel, deadline) => {
  const url = `${process.env.FRONTEND_URL}/picks`;
  const deadlineStr = new Date(deadline).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: `68 Ski-Doo — ${weekLabel} picks are open`,
    html: htmlWrap(`${weekLabel.toUpperCase()} PICKS ARE OPEN`, `
      ${p(`Hey <strong style="color:#f5a623;">${displayName}</strong> — time to make your picks.`)}
      ${p(`Deadline: <strong style="color:#f5a623;">${deadlineStr}</strong>`)}
      ${btn('SUBMIT PICKS →', url)}
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
      ${p(`<strong style="color:#f5a623;">${displayName}</strong> — you haven't submitted your ${weekLabel} picks yet.`)}
      ${p(`Deadline: <strong style="color:#f5a623;">${deadlineStr} today</strong>`)}
      ${p("If you don't submit, Randy the Randomizer will pick for you.")}
      ${btn('SUBMIT PICKS NOW →', url)}
    `)
  });
};

const sendRandyEmail = async (email, displayName, weekLabel, picks) => {
  const pickList = picks.map((p, i) =>
    `<div style="padding:8px 12px;background:#0d2b1d;margin:4px 0;border-left:3px solid #f5a623;font-size:13px;color:#d4c9a8;">
      ${i + 1}. ${p.team} — ${p.pickType === 'win_vs_power4' ? 'WIN vs P4 (1pt)' : 'UPSET LOSS (2pts)'}
    </div>`
  ).join('');

  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: `🎲 68 Ski-Doo — Randy picked your ${weekLabel} picks`,
    html: htmlWrap('RANDY HAS SPOKEN', `
      ${p(`<strong style="color:#f5a623;">${displayName}</strong> — you didn't submit your ${weekLabel} picks before the deadline, so Randy the Randomizer stepped in.`)}
      ${p('Here are your auto-assigned picks:')}
      ${pickList}
      ${divider()}
      ${p('Better luck next week. Set a reminder.')}
    `)
  });
};

const sendResultsEmail = async (email, displayName, weekLabel, totalPoints, weekRank, seasonRank) => {
  const url = `${process.env.FRONTEND_URL}/leaderboard`;
  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: `68 Ski-Doo — ${weekLabel} results are in`,
    html: htmlWrap(`${weekLabel.toUpperCase()} RESULTS`, `
      ${p(`<strong style="color:#f5a623;">${displayName}</strong> — the scores are in.`)}
      <div style="background:#0d2b1d;padding:20px;margin:16px 0;border:1px solid #1e3d2a;">
        <div style="font-size:48px;font-weight:900;color:#f5a623;font-family:'Courier New',monospace;line-height:1;">
          ${totalPoints} PTS
        </div>
        <div style="font-size:12px;letter-spacing:2px;color:#8bb89a;margin-top:4px;">THIS WEEK</div>
        <div style="margin-top:16px;font-size:14px;color:#d4c9a8;">
          Week rank: <strong style="color:#f5a623;">#${weekRank}</strong> &nbsp;·&nbsp;
          Season rank: <strong style="color:#f5a623;">#${seasonRank}</strong>
        </div>
      </div>
      ${btn('VIEW FULL LEADERBOARD →', url)}
    `)
  });
};

const sendPasswordResetEmail = async (email, displayName, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await getTransporter().sendMail({
    from: from(),
    to: email,
    subject: '68 Ski-Doo — Reset Your Password',
    html: htmlWrap('RESET YOUR PASSWORD', `
      ${p(`Hey <strong style="color:#f5a623;">${displayName}</strong> — we got a request to reset your password.`)}
      ${p('Click the button below. This link expires in <strong style="color:#f5a623;">1 hour</strong>.')}
      ${btn('RESET PASSWORD →', url)}
      ${divider()}
      ${p('If you didn\'t request this, ignore this email. Your password won\'t change.')}
      ${p(`Or copy this link: <span style="color:#8bb89a;">${url}</span>`)}
    `)
  });
};

module.exports = {
  sendVerificationEmail,
  sendInviteEmail,
  sendPicksOpenEmail,
  sendDeadlineReminderEmail,
  sendRandyEmail,
  sendResultsEmail,
  sendPasswordResetEmail,
};
