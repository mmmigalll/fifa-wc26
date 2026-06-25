import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  fetchMatchById,
  fetchMatchHeadToHead,
  fetchTeamRecentMatches,
  fetchWorldCupStandings,
  type H2HMatch,
} from '@/lib/football';

export const dynamic = 'force-dynamic';

type FormEntry = {
  opponent: string;
  score: string;
  result: 'W' | 'D' | 'L';
  date: string;
};

async function teamForm(teamName: string, before: Date): Promise<FormEntry[]> {
  const matches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      startAt: { lt: before },
      OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
    },
    orderBy: { startAt: 'desc' },
    take: 5,
  });

  return matches.map((m: (typeof matches)[number]) => {
    const isHome = m.homeTeam === teamName;
    const gf = isHome ? m.homeScore! : m.awayScore!;
    const ga = isHome ? m.awayScore! : m.homeScore!;
    const result: FormEntry['result'] = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
    return {
      opponent: isHome ? m.awayTeam : m.homeTeam,
      score: `${gf}:${ga}`,
      result,
      date: m.startAt.toISOString(),
    };
  });
}

function findGroupTable(groupName: string | null, standings: Awaited<ReturnType<typeof fetchWorldCupStandings>>) {
  if (!groupName) return null;
  const normalized = groupName.replace(/^GROUP_/, 'Group ');
  return (
    standings.find((s) => s.group === groupName)?.table ??
    standings.find((s) => s.group?.replace(/^GROUP_/, 'Group ') === normalized)?.table ??
    null
  );
}

function mapLineup(team: Awaited<ReturnType<typeof fetchMatchById>>['homeTeam']) {
  const mapPlayer = (p: { name: string; position?: string | null; shirtNumber?: number | null }) => ({
    name: p.name,
    position: p.position ?? null,
    shirtNumber: p.shirtNumber ?? null,
  });

  return {
    formation: team.formation ?? null,
    coach: team.coach?.name ?? null,
    lineup: (team.lineup ?? []).map(mapPlayer),
    bench: (team.bench ?? []).map(mapPlayer),
  };
}

function mapOdds(odds: Awaited<ReturnType<typeof fetchMatchById>>['odds']) {
  if (!odds) return null;
  if (odds.homeWin == null && odds.draw == null && odds.awayWin == null) return null;
  return {
    homeWin: odds.homeWin ?? null,
    draw: odds.draw ?? null,
    awayWin: odds.awayWin ?? null,
  };
}

function mapRecentMatch(x: H2HMatch) {
  return {
    id: x.id,
    date: x.utcDate,
    status: x.status,
    competition: x.competition?.name ?? null,
    homeTeam: x.homeTeam.name,
    awayTeam: x.awayTeam.name,
    homeCrest: x.homeTeam.crest,
    awayCrest: x.awayTeam.crest,
    homeScore: x.score.fullTime.home,
    awayScore: x.score.fullTime.away,
  };
}

async function teamRecentFromDb(teamName: string, before: Date, limit = 5) {
  const matches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      startAt: { lt: before },
      OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
    },
    orderBy: { startAt: 'desc' },
    take: limit,
  });

  return matches.map((m: (typeof matches)[number]) => ({
    id: m.id,
    date: m.startAt.toISOString(),
    status: m.status,
    competition: 'FIFA World Cup',
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeCrest: m.homeCrest,
    awayCrest: m.awayCrest,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
  }));
}

async function loadTeamRecent(
  teamId: number | undefined,
  teamName: string,
  before: Date,
) {
  if (teamId) {
    try {
      const matches = await fetchTeamRecentMatches(teamId);
      if (matches.length > 0) return matches.map(mapRecentMatch);
    } catch {
      // fall back to synced WC matches in our DB
    }
  }
  return teamName ? teamRecentFromDb(teamName, before) : [];
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid match id' }, { status: 400 });
  }

  try {
    const [m, h2h, standings] = await Promise.all([
      fetchMatchById(id),
      fetchMatchHeadToHead(id).catch(() => ({ aggregates: null, matches: [] })),
      fetchWorldCupStandings().catch(() => []),
    ]);

    const referee = m.referees?.find((r) => r.type === 'REFEREE')?.name ?? null;
    const startAt = m.utcDate;
    const homeTeam = m.homeTeam.name ?? '';
    const awayTeam = m.awayTeam.name ?? '';

    const [homeForm, awayForm, homeRecent, awayRecent] = await Promise.all([
      homeTeam ? teamForm(homeTeam, new Date(startAt)) : [],
      awayTeam ? teamForm(awayTeam, new Date(startAt)) : [],
      loadTeamRecent(m.homeTeam.id, homeTeam, new Date(startAt)),
      loadTeamRecent(m.awayTeam.id, awayTeam, new Date(startAt)),
    ]);

    const groupTable = findGroupTable(m.group, standings);

    return NextResponse.json({
      id: m.id,
      homeTeam,
      awayTeam,
      homeCrest: m.homeTeam.crest,
      awayCrest: m.awayTeam.crest,
      homeTla: m.homeTeam.tla ?? m.homeTeam.shortName ?? null,
      awayTla: m.awayTeam.tla ?? m.awayTeam.shortName ?? null,
      stage: m.stage,
      groupName: m.group,
      competition: m.competition?.name ?? 'FIFA World Cup',
      startAt,
      status: m.status,
      minute: m.minute ?? null,
      homeScore: m.score.fullTime.home,
      awayScore: m.score.fullTime.away,
      halfTimeHome: m.score.halfTime?.home ?? null,
      halfTimeAway: m.score.halfTime?.away ?? null,
      venue: m.venue ?? null,
      referee,
      h2h: {
        aggregates: h2h.aggregates,
        homeRecent,
        awayRecent,
        matches: h2h.matches.map(mapRecentMatch),
      },
      homeForm,
      awayForm,
      lineups: {
        home: mapLineup(m.homeTeam),
        away: mapLineup(m.awayTeam),
      },
      odds: mapOdds(m.odds),
      groupTable: groupTable?.map((row) => ({
        position: row.position,
        team: row.team.name,
        crest: row.team.crest ?? null,
        played: row.playedGames,
        won: row.won,
        draw: row.draw,
        lost: row.lost,
        gf: row.goalsFor,
        ga: row.goalsAgainst,
        gd: row.goalDifference,
        points: row.points,
      })) ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load match';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
