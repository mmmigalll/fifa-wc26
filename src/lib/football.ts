// football-data.org v4 client.
// The free tier includes the FIFA World Cup (competition code "WC").

const API_BASE = 'https://api.football-data.org/v4';

export type ApiPlayer = {
  id?: number;
  name: string;
  position?: string | null;
  shirtNumber?: number | null;
};

export type ApiTeam = {
  id?: number;
  name: string | null;
  crest: string | null;
  shortName?: string | null;
  tla?: string | null;
  formation?: string | null;
  coach?: { name?: string | null } | null;
  lineup?: ApiPlayer[];
  bench?: ApiPlayer[];
};

export type MatchOdds = {
  homeWin: number | null;
  draw: number | null;
  awayWin: number | null;
};

export type ApiMatch = {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  stage: string | null;
  group: string | null;
  venue?: string | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  };
  referees?: { name: string; type: string }[];
  competition?: { name?: string | null };
  odds?: MatchOdds | null;
};

export type H2HMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { name: string | null; crest: string | null };
  awayTeam: { name: string | null; crest: string | null };
  score: { fullTime: { home: number | null; away: number | null } };
  competition?: { name?: string | null };
};

export type H2HAggregates = {
  numberOfMatches: number;
  totalGoals: number;
  homeTeam: { wins: number; draws: number; losses: number };
  awayTeam: { wins: number; draws: number; losses: number };
};

export type StandingsRow = {
  position: number;
  team: { id: number; name: string; crest?: string | null };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type GroupStandings = {
  group: string | null;
  table: StandingsRow[];
};

async function apiFetch(path: string) {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN is not set');

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-Auth-Token': token },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`football-data.org responded ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export async function fetchWorldCupMatches(): Promise<ApiMatch[]> {
  const data = (await apiFetch('/competitions/WC/matches')) as { matches: ApiMatch[] };
  return data.matches ?? [];
}

export async function fetchMatchById(id: number): Promise<ApiMatch> {
  return (await apiFetch(`/matches/${id}`)) as ApiMatch;
}

export async function fetchMatchHeadToHead(id: number, limit = 5) {
  const data = (await apiFetch(`/matches/${id}/head2head?limit=${limit}`)) as {
    aggregates?: H2HAggregates;
    matches?: H2HMatch[];
  };

  return {
    aggregates: data.aggregates ?? null,
    matches: data.matches ?? [],
  };
}

export async function fetchTeamRecentMatches(teamId: number, limit = 5): Promise<H2HMatch[]> {
  const data = (await apiFetch(
    `/teams/${teamId}/matches?status=FINISHED&limit=${limit}`,
  )) as { matches?: H2HMatch[] };
  return data.matches ?? [];
}

export async function fetchWorldCupStandings(): Promise<GroupStandings[]> {
  const data = (await apiFetch('/competitions/WC/standings')) as {
    standings?: { group: string | null; type: string; table: StandingsRow[] }[];
  };

  return (data.standings ?? [])
    .filter((s) => s.type === 'TOTAL')
    .map((s) => ({ group: s.group, table: s.table }));
}
