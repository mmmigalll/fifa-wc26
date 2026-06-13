// Runs once when the Next.js server boots (Railway runs it 24/7, so a plain
// interval is a reliable cron). Equivalent of:
//   */15 * * * * curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/sync

const EVERY_15_MIN = 15 * 60 * 1000;

async function runSync() {
  const port = process.env.PORT ?? '3000';
  try {
    const res = await fetch(`https://fifa-wc26-production.up.railway.app/api/cron/sync`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const body = await res.json().catch(() => null);
    console.log(`[cron] sync ${res.status}`, body);
  } catch (err) {
    console.error('[cron] sync failed:', err);
  }
}

export function register() {
  // Only in the Node.js server runtime (not edge, not the build step).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.CRON_SECRET) {
    console.warn('[cron] CRON_SECRET not set, scheduler disabled');
    return;
  }

  // First run shortly after boot (gives the HTTP server time to start
  // listening), then every 15 minutes.
  setTimeout(runSync, 15_000);
  setInterval(runSync, EVERY_15_MIN);
  console.log('[cron] sync scheduler started (every 15 minutes)');
}
