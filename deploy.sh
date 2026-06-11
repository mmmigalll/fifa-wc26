#!/usr/bin/env bash
# One-command production deploy: Vercel (hosting) + any Postgres (Neon free tier recommended).
#
# Prerequisites (one-time, ~5 minutes):
#   1. npm i -g vercel && vercel login
#   2. Free Postgres: https://neon.tech -> create project -> copy the connection string
#   3. Free API key:  https://www.football-data.org/client/register
#   4. (optional)     https://resend.com API key for login emails;
#                     skip it and codes will be printed to Vercel function logs.
#
# Then run:  ./deploy.sh
set -euo pipefail

command -v vercel >/dev/null || { echo "Install the Vercel CLI first: npm i -g vercel && vercel login"; exit 1; }

read -rp "Postgres DATABASE_URL (from Neon): " DATABASE_URL
read -rp "football-data.org token: " FOOTBALL_DATA_TOKEN
read -rp "Resend API key (Enter to skip): " RESEND_API_KEY
read -rp "Email FROM address [WC26 <login@yourdomain.com>]: " EMAIL_FROM
EMAIL_FROM=${EMAIL_FROM:-"WC26 <login@yourdomain.com>"}

AUTH_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 16)
echo "Generated AUTH_SECRET and CRON_SECRET."

echo "==> Installing dependencies and creating tables..."
npm install
DATABASE_URL="$DATABASE_URL" npx prisma db push

echo "==> Linking Vercel project (accept the defaults)..."
vercel link

echo "==> Setting production environment variables..."
printf '%s' "$DATABASE_URL"        | vercel env add DATABASE_URL production
printf '%s' "$AUTH_SECRET"         | vercel env add AUTH_SECRET production
printf '%s' "$CRON_SECRET"         | vercel env add CRON_SECRET production
printf '%s' "$FOOTBALL_DATA_TOKEN" | vercel env add FOOTBALL_DATA_TOKEN production
printf '%s' "$EMAIL_FROM"          | vercel env add EMAIL_FROM production
if [ -n "$RESEND_API_KEY" ]; then
  printf '%s' "$RESEND_API_KEY" | vercel env add RESEND_API_KEY production
fi

echo "==> Deploying to production..."
URL=$(vercel --prod | tail -n1)
echo "Deployed: $URL"

echo "==> Loading World Cup fixtures (first sync)..."
curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$URL/api/cron/sync" && echo

cat <<EOF

Done. Final checklist:
  - Open $URL and sign in.
  - Vercel Hobby runs crons only daily. For 15-min result syncs, add a free
    monitor at https://cron-job.org hitting:
      $URL/api/cron/sync
    with header:  Authorization: Bearer $CRON_SECRET
  - If you skipped Resend: login codes appear in Vercel -> Project -> Logs.
    Add RESEND_API_KEY later + verify your domain to send real emails.

Save this somewhere safe:
  CRON_SECRET=$CRON_SECRET
EOF
