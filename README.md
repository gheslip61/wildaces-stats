# Wild Aces Stats

> A full-stack slo-pitch stats dashboard for the Wild Aces (Recreational Slo-Pitch Team) that track at-bats, player performance, game scores, and more.

## Highlights

- **Live stats** — batting average, OBP, SLG, OPS, RBI and more for every player
- **3 Stars** — algorithm-driven best performers of each game using linear weights and leverage scoring
- **Game Scores** — inning-by-inning box scores for every game
- **Optimal Lineup** — algorithm-generated batting order with optional recency weighting
- **Scoresheet Import** — scan a paper scoresheet with AI and auto-extract at-bats for review before saving
- **Mobile-friendly** — built to be usable from any phone

## Overview

Wild Aces Stats is a private slo-pitch stats tracker built for the Wild Aces rec league team. It replaces manual scorekeeping with a live web app anyone on the team can pull up on their phone.

The backend is a Python/FastAPI REST API connected to a PostgreSQL database. The frontend is a React + TypeScript app built with Vite and Tailwind CSS.

## 🚀 Usage

The app is live at **https://519wildacesstats.vercel.app**.

Data entry and scoresheet import are password-protected.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, Uvicorn |
| Database | PostgreSQL |
| AI | Anthropic Claude (scoresheet scanning) |
| Hosting | Vercel (frontend) + Railway (backend) |
