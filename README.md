# WC26 Predictions

Full-stack prediction game for the FIFA World Cup 2026. Users sign in with an
email code, predict the winner (and optionally the exact score) of every match,
and points are calculated automatically when matches finish.

**Stack:** Next.js 14 (App Router, TypeScript) · PostgreSQL · Prisma · Resend (email) · football-data.org (fixtures & results)

## Quick start with Docker (recommended)

The whole stack — app, PostgreSQL, and a sync sidecar that auto-scores matches
every 15 minutes — runs with one command. You only need Docker installed.

```bash
cp .env.example .env
# Edit .env and set three values:
#   AUTH_SECRET           openssl rand -hex 32
#   CRON_SECRET           openssl rand -hex 16
#   FOOTBALL_DATA_TOKEN   free key: https://www.football-data.org/client/register
# (DATABASE_URL can stay as-is — docker compose overrides it with the bundled Postgres.)

docker compose up -d --build
```

Open http://localhost:3000. Fixtures load automatically ~30 seconds after start
(the `sync` sidecar's first run); after that it re-syncs and scores finished
matches every 15 minutes — no Vercel cron or external pinger needed.

Without `RESEND_API_KEY`, login codes are printed to the app logs instead of
emailed — view them with `docker compose logs -f app`. Useful commands:

```bash
docker compose logs -f sync      # watch fixture syncs / scoring runs
docker compose down              # stop (data persists in the dbdata volume)
docker compose down -v           # stop and wipe the database
```

To put it on the public internet from a VPS, set `NEXT_PUBLIC_APP_URL` and
`APP_PORT` in `.env` and point a reverse proxy (Caddy/nginx) with TLS at the
app port — everything else is identical.

## Scoring rules

| Outcome | Points |
|---|---|
| Exact score guessed (e.g. predicted 2:1, final 2:1) | **3** |
| Correct winner/draw only | **1** |
| Wrong | 0 |

Exact score does not stack with the outcome point (3 total, not 4). Predictions
**lock 2 hours before kickoff** — enforced server-side in
`src/app/api/predictions/route.ts` and shown to users in the banner on the
matches page. All times are stored in UTC and displayed in each user's local timezone.

## Requirements → code map

| # | Requirement | Where |
|---|---|---|
| 1 | Email + emailed passcode login | `src/app/login`, `src/app/api/auth/*`, `src/lib/auth.ts`, `src/lib/email.ts` |
| 2 | Past matches with results + upcoming matches | `src/app/matches/page.tsx` |
| 3 | 4-hour cutoff + notification banner | banner in `matches/page.tsx`, enforcement in `api/predictions/route.ts`, constant in `src/lib/scoring.ts` |
| 4 | 1 point for correct outcome | `calculatePoints()` in `src/lib/scoring.ts` |
| 5 | 3 points for exact score | same |
| 6 | Click a user in the table → full point breakdown | `src/app/leaderboard/page.tsx` → `src/app/users/[id]/page.tsx` |
| 7 | Automatic scoring after each match | `src/app/api/cron/sync/route.ts` + cron in `vercel.json` |

## Local setup without Docker

```bash
npm install
cp .env.example .env        # fill in values, see notes below
npx prisma db push          # create tables
npm run dev
```

`.env` notes:

- `DATABASE_URL` — any PostgreSQL (local, Neon, Supabase, Railway).
- `FOOTBALL_DATA_TOKEN` — free key from https://www.football-data.org/client/register.
  The free tier includes the World Cup (competition code `WC`).
- `RESEND_API_KEY` — leave **empty** in development: login codes are printed to
  the server console instead of being emailed.
- `AUTH_SECRET` / `CRON_SECRET` — `openssl rand -hex 32`.

Pull fixtures for the first time (and any time you want a manual sync):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync
```

## Automatic scoring (requirement 7)

`GET /api/cron/sync` does two things, idempotently:

1. Upserts every WC fixture/result from football-data.org (match IDs are the
   API's own IDs, so re-running is safe). Placeholder knockout fixtures without
   decided teams are skipped until teams are known.
2. Finds matches with `status = FINISHED` and `scoredAt IS NULL`, calculates
   points for every prediction in a transaction, and stamps `scoredAt`.

Scheduling options:

- **Vercel Pro** — `vercel.json` already schedules it every 15 minutes.
  Vercel automatically sends `Authorization: Bearer $CRON_SECRET`.
- **Vercel Hobby** — crons are limited to once per day; use an external
  pinger such as cron-job.org hitting the URL with the same header.
- **Own server / Railway / Fly** — plain crontab:
  `*/15 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron/sync`

## Deploying (fastest path)

1. Create a Postgres database (Neon free tier works well with Vercel).
2. Push the repo to GitHub → import in Vercel.
3. Set all env vars from `.env.example` in Vercel project settings.
4. Run `npx prisma db push` once against the production `DATABASE_URL`.
5. Verify your sending domain in Resend and set `EMAIL_FROM`.
6. Trigger `/api/cron/sync` once to load the fixtures.

## Design notes / extension points

- Knockout matches: scoring uses the full-time score from the API. If you want
  "result after penalties" semantics instead, switch `calculatePoints` to use
  the `score.winner` field already exposed in `src/lib/football.ts`.
- Open predictions are hidden from other users (only locked/finished picks show
  on the breakdown page) so nobody can copy picks before the deadline.
- `LoginCode` rows are single-use, hashed (HMAC-SHA256), expire after 10
  minutes, and allow max 5 verify attempts and 5 sends per hour.
