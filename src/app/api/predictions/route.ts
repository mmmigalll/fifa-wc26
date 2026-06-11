import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isLocked, outcomeFromScore, LOCK_HOURS } from '@/lib/scoring';
import type { Pick } from '@prisma/client';

const PICKS: Pick[] = ['HOME', 'DRAW', 'AWAY'];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const matchId = Number(body?.matchId);
  let pick = body?.pick as Pick | undefined;
  const rawHome = body?.predHome;
  const rawAway = body?.predAway;

  if (!Number.isInteger(matchId)) {
    return NextResponse.json({ error: 'Invalid match.' }, { status: 400 });
  }

  // Optional exact score: both fields or neither.
  const hasScore = rawHome !== null && rawHome !== undefined && rawHome !== ''
    && rawAway !== null && rawAway !== undefined && rawAway !== '';
  let predHome: number | null = null;
  let predAway: number | null = null;

  if (hasScore) {
    predHome = Number(rawHome);
    predAway = Number(rawAway);
    const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= 20;
    if (!valid(predHome) || !valid(predAway)) {
      return NextResponse.json({ error: 'Scores must be whole numbers from 0 to 20.' }, { status: 400 });
    }
    // An exact score always implies the outcome — keep them consistent.
    pick = outcomeFromScore(predHome, predAway);
  }

  if (!pick || !PICKS.includes(pick)) {
    return NextResponse.json({ error: 'Pick home win, draw, or away win.' }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });

  if (isLocked(match.startAt) || match.status === 'FINISHED') {
    return NextResponse.json(
      { error: `Predictions lock ${LOCK_HOURS} hours before kickoff. This match is closed.` },
      { status: 409 },
    );
  }

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId: session.userId, matchId } },
    update: { pick, predHome, predAway },
    create: { userId: session.userId, matchId, pick, predHome, predAway },
  });

  return NextResponse.json({ ok: true, prediction });
}
