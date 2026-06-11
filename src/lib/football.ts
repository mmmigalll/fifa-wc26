// football-data.org v4 client.
// The free tier includes the FIFA World Cup (competition code "WC").

const API_BASE = 'https://api.football-data.org/v4';

export type ApiMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string | null;
  group: string | null;
  homeTeam: { name: string | null; crest: string | null };
  awayTeam: { name: string | null; crest: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
    // For knockout games we count the result after extra time / penalties as
    // the "winner" outcome, which football-data exposes via `winner`.
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  };
};

export async function fetchWorldCupMatches(): Promise<ApiMatch[]> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN is not set');

  const res = await fetch(`${API_BASE}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': token },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`football-data.org responded ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { matches: ApiMatch[] };
  return data.matches ?? [];
}
