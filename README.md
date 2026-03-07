# 68 Ski-Doo — 2026 College Football Pick'em

Invite-only college football pick'em league app. 68 Power 4 + Notre Dame teams, 14 weeks, 68 total picks per player.

---

## Project Structure

```
68skidoo/
├── backend/          Node.js + Express API
│   ├── models/       Mongoose models (User, WeeklyPick, Season)
│   ├── routes/       auth, picks, admin, chat
│   ├── jobs/         Randy cron + ESPN auto-scorer
│   ├── utils/        teams.js, email.js, seedSchedule.js, seedAdmin.js
│   └── server.js
├── frontend/         React 18 + Vite
│   └── src/
│       ├── pages/    Dashboard, SubmitPicks, Leaderboard, History, Rules, Profile
│       ├── pages/admin/  AdminDashboard, Scoring, Weeks, Users, Invites
│       ├── components/   Layout, Chat
│       ├── context/  AuthContext
│       └── styles/   global.css (retro scoreboard theme)
└── README.md
```

---

## Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)
- CFBD API key → https://collegefootballdata.com/key
- Gmail account with App Password (Google Account → Security → App Passwords)
- AWS account (EC2 for backend)
- Vercel account (free, for frontend)
- Domain: murphdunks.com (or subdomain like skidoo.murphdunks.com)

---

## Step 1 — Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/68skidoo.git
cd 68skidoo

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

---

## Step 2 — Configure Backend Environment

```bash
cd backend
cp .env.example .env
nano .env   # fill in all values
```

Key values to set:
- `MONGODB_URI` — your Atlas connection string (`skidoo2026` database)
- `JWT_SECRET` — run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` to generate
- `CFBD_API_KEY` — from collegefootballdata.com
- `EMAIL_USER` / `EMAIL_PASS` — Gmail + App Password
- `FRONTEND_URL` — `https://skidoo.murphdunks.com` (or wherever you deploy)

---

## Step 3 — Seed the Database

```bash
cd backend

# 1. Create commissioner account
ADMIN_EMAIL=you@gmail.com \
ADMIN_PASSWORD=yourpassword \
ADMIN_DISPLAY_NAME="Dan" \
ADMIN_USERNAME=dan \
node -r dotenv/config utils/seedAdmin.js

# 2. Pull 2026 schedule from CFBD (run once before season)
node -r dotenv/config utils/seedSchedule.js
```

The schedule seed fetches all 2026 games, identifies P4 vs non-P4 matchups,
and pre-computes upset eligibility for every team every week.

---

## Step 4 — Run Locally

```bash
# Terminal 1 — Backend
cd backend
npm run dev        # runs on :5000

# Terminal 2 — Frontend
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api
npm run dev        # runs on :5173
```

Visit http://localhost:5173 — log in with your commissioner account.

---

## Step 5 — Deploy Backend to AWS EC2

```bash
# On your EC2 instance (Ubuntu):
sudo apt update && sudo apt install -y nodejs npm git
sudo npm install -g pm2

git clone https://github.com/YOUR_USERNAME/68skidoo.git
cd 68skidoo/backend
npm install
cp .env.example .env && nano .env   # fill in production values

# Start with PM2 (keeps running after logout)
pm2 start server.js --name skidoo-api
pm2 startup        # follow instructions to auto-start on reboot
pm2 save

# Optional: set up nginx reverse proxy on port 80/443
# sudo apt install -y nginx certbot python3-certbot-nginx
```

EC2 Security Group: open port 5000 (or 80/443 if using nginx).

---

## Step 6 — Deploy Frontend to Vercel

```bash
cd frontend
npm run build       # creates dist/
```

**Via Vercel CLI:**
```bash
npm i -g vercel
vercel --prod
```

Or push to GitHub and connect the repo in vercel.com dashboard.

**Environment variable in Vercel:**
```
VITE_API_URL = https://YOUR_EC2_IP:5000/api
```
(or your backend domain if you set up nginx + SSL)

**Connect murphdunks.com:**
In Vercel → Project Settings → Domains → add `skidoo.murphdunks.com`
Then in your DNS: add CNAME `skidoo → cname.vercel-dns.com`

---

## Step 7 — Commissioner Workflow

### Start of each week:
1. Go to `/admin` → **Manage Weeks**
2. Find the week, click **Edit**, set the Thursday noon deadline
3. Click **Open** — all players get an email
4. Randy fires automatically at the deadline for no-shows

### After the weekend:
1. Go to `/admin/scoring/[week]`
2. Click **↻ Refresh from ESPN** — scores pull automatically
3. Review all picks (expand each player to see/override)
4. Click **Finalize Week** — locks scores, updates standings, sends result emails

### Invite a new player:
1. Go to `/admin/invites`
2. Enter their email + click Create — they get an invite email
3. Or create a generic link and text it to them

---

## Key Rules Enforced by the App

- Each Power 4 team usable **once per season total** (win OR upset, not both)
- Upset picks only available when team is actually playing a non-P4 opponent that week (pre-computed from CFBD schedule)
- Deadline: Thursday noon (configurable per week in admin)
- Randy fires at deadline for any player who hasn't submitted — respects per-season team uniqueness
- Picks hidden from other players until the week is scored
- Week finalizes → season standings update → result emails send

---

## Multi-Season Setup (Future Years)

1. Update `CURRENT_SEASON=2027` in `.env`
2. Create a new MongoDB database `skidoo2027`
3. Re-run `seedSchedule.js` for the new year
4. Re-run `seedAdmin.js` (idempotent — just sets isAdmin flag)
5. All users' `usedTeams` and `seasonPoints` reset naturally since they're filtered by season

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js 18, Express 4, Mongoose 8 |
| Database | MongoDB Atlas |
| Auth | JWT (7-day tokens) |
| Email | Nodemailer + Gmail SMTP |
| Schedule | CFBD API (one-time seed) |
| Scoring | CFBD API (Sunday auto-pull) |
| Cron | node-cron (Randy + reminders) |
| Frontend | React 18, Vite, React Router 6 |
| Hosting | AWS EC2 (API) + Vercel (frontend) |
| Domain | murphdunks.com |
