# Wild Aces Stats

> A full-stack baseball stats dashboard for the Wild Aces — track at-bats, player performance, game scores, and more.

## 🌟 Highlights

- **Live stats** — batting average, OBP, SLG, OPS, RBI and more for every player
- **3 Aces** — algorithm-driven best performers of each game using linear weights and leverage scoring
- **Game Scores** — inning-by-inning box scores for every game
- **Optimal Lineup** — algorithm-generated batting order with optional recency weighting (recent games count more)
- **Scoresheet Import** — scan a paper scoresheet with AI and auto-extract at-bats for review before saving
- **Mobile-friendly** — built to be usable from any phone

## ℹ️ Overview

Wild Aces Stats is a private baseball stats tracker built for the Wild Aces rec league team. It replaces manual scorekeeping with a live web app anyone on the team can pull up on their phone.

The backend is a Python/FastAPI REST API connected to a Supabase (PostgreSQL) database. The frontend is a React + TypeScript app built with Vite and Tailwind CSS.

## 🚀 Usage

The app is live at **[your Vercel URL here]** — no login required to view stats.

Data entry and scoresheet import are password-protected.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, Uvicorn |
| Database | PostgreSQL via Supabase |
| AI | Anthropic Claude (scoresheet scanning) |
| Hosting | Vercel (frontend) + Railway (backend) |

## ⬇️ Running Locally

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Set the following environment variables in `backend/.env`:
```
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
ANTHROPIC_API_KEY=
ENTRY_PASSWORD=
```

And in `frontend/.env.local`:
```
VITE_API_URL=http://localhost:8000
```
