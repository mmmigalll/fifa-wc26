import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchWorldCupMatches } from '@/lib/football';
import { calculatePoints } from '@/lib/scoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Requirement 7: runs on a schedule (see vercel.json), pulls fixtures and
// results, then calculates points for every finished match with a full-time score.
// Points are recalculated on each run so late score corrections from the API
// are reflected (scoredAt only records when a match was first scored).
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1) Sync fixtures and results.
  const apiMatches = await fetchWorldCupMatches();
  let synced = 0;

  for (const m of apiMatches) {
    // Skip placeholder knockout fixtures where teams are not yet decided.
    if (!m.homeTeam?.name || !m.awayTeam?.name) continue;

    const data = {
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      homeCrest: m.homeTeam.crest,
      awayCrest: m.awayTeam.crest,
      stage: m.stage,
      groupName: m.group,
      startAt: new Date(m.utcDate),
      status: m.status,
      homeScore: m.score.fullTime.home,
      awayScore: m.score.fullTime.away,
    };

    await prisma.match.upsert({
      where: { id: m.id },
      update: data,
      create: { id: m.id, ...data },
    });
    synced++;
  }

  // 2) Score every finished match with a known full-time result.
  const toScore = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      homeScore: { not: null },
      awayScore: { not: null },
    },
    include: { predictions: true },
  });

  let scoredMatches = 0;

  for (const match of toScore) {
    const result = { homeScore: match.homeScore!, awayScore: match.awayScore! };
    const firstScore = match.scoredAt === null;

    await prisma.$transaction([
      ...match.predictions.map((p) =>
        prisma.prediction.update({
          where: { id: p.id },
          data: { points: calculatePoints(p, result) },
        }),
      ),
      ...(firstScore
        ? [
            prisma.match.update({
              where: { id: match.id },
              data: { scoredAt: new Date() },
            }),
          ]
        : []),
    ]);
    scoredMatches++;
  }

  return NextResponse.json({ ok: true, synced, scoredMatches });
}
