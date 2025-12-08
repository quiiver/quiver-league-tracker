# ArcheryLeague Tracker

ArcheryLeague Tracker ingests archery league results from the public Results API, stores them in a local Prisma-managed database, and exposes both an HTTP API and a React dashboard for real-time leaderboards and archer analytics.

## Features

- **Idempotent ingestion pipeline** using Prisma and durable upserts to keep tournament data in sync.
- **Results API client** with schema validation powered by Zod.
- **Scoring engine** that parses encoded score strings, computes totals, tie breakers, and rankings.
- **CLI toolkit** for ad-hoc synchronisation, data exploration, and operational workflows.
- **Fastify API** serving leaderboard, event, and archer endpoints plus ingestion webhooks.
- **Vite + React dashboard** with React Query data fetching for live leaderboards and breakdowns.

## Prerequisites

- Node.js 20+
- SQLite (bundled via Prisma; no separate install required)

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   ```
   Adjust `DATABASE_URL`, `PORT`, and any API overrides as needed.

3. **Generate Prisma client and apply migrations**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```

4. **Sync tournament data**
   ```bash
   npm run build --workspace @archeryleague/core
   npm run build --workspace @archeryleague/cli
   npx archeryleague sync:tournament 2477
   ```

5. **Run the API and web dashboard**
   ```bash
   npm run dev:api
   # In another terminal
   npm run dev --workspace @archeryleague/web
   ```

   The API defaults to `http://localhost:3333` and the web dashboard to `http://localhost:5173` with `/api` proxied to the API server.

## Project Structure

- `packages/core` – shared domain logic, Prisma access, scoring utilities, ingestion services, leaderboard analytics.
- `packages/cli` – command line interface for synchronising and inspecting data.
- `apps/api` – Fastify HTTP API exposing ingestion and leaderboard endpoints.
- `apps/web` – Vite + React dashboard for tournaments, events, and archer profiles.
- `prisma` – Prisma schema and migrations.

## CLI Usage

```bash
# Sync an entire tournament (idempotent)
archeryleague sync:tournament 2477

# Sync a single event
archeryleague sync:event 4168 --tournament 2477

# Display leaderboard summaries
archeryleague leaderboard:tournament 2477
archeryleague leaderboard:event 4168

# Inspect an archer's season
archeryleague archer 297149 --tournament 2477
```

## API Overview

- `GET /health`
- `POST /api/tournaments/:id/sync`
- `POST /api/events/:id/sync`
- `GET /api/tournaments`
- `GET /api/tournaments/:id/leaderboard`
- `GET /api/tournaments/:id/events`
- `GET /api/events/:id/leaderboard`
- `GET /api/archers/:id?tournamentId=...`

## Testing & Linting

- `npm run lint` – ESLint across packages and apps.
- `npm run build` – Type-check and build core, cli, and api workspaces.

## Deployment Notes

- API is stateless; deploy on any Node 20 environment.
- Database uses SQLite by default; update `DATABASE_URL` for Postgres if desired.
- Build the web dashboard via `npm run build --workspace @archeryleague/web` and serve static assets from a CDN or via the Fastify static handler.
