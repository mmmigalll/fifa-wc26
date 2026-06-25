'use client';

import { useCallback, useEffect, useState } from 'react';
import { LocalTime } from '@/components/LocalTime';

type MatchSnapshot = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeCrest: string | null;
  awayCrest: string | null;
  stage: string | null;
  groupName: string | null;
  startAt: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
};

type FormEntry = {
  opponent: string;
  score: string;
  result: 'W' | 'D' | 'L';
  date: string;
};

type H2HMatchRow = {
  id: number;
  date: string;
  status: string;
  competition: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeCrest: string | null;
  awayCrest: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

type TableRow = {
  position: number;
  team: string;
  crest: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

type LineupPlayer = {
  name: string;
  position: string | null;
  shirtNumber: number | null;
};

type TeamLineup = {
  formation: string | null;
  coach: string | null;
  lineup: LineupPlayer[];
  bench: LineupPlayer[];
};

type MatchOdds = {
  homeWin: number | null;
  draw: number | null;
  awayWin: number | null;
};

type MatchDetails = MatchSnapshot & {
  homeTla: string | null;
  awayTla: string | null;
  competition: string;
  minute: number | null;
  halfTimeHome: number | null;
  halfTimeAway: number | null;
  venue: string | null;
  referee: string | null;
  h2h: {
    aggregates: {
      numberOfMatches: number;
      totalGoals: number;
      homeTeam: { wins: number; draws: number; losses: number };
      awayTeam: { wins: number; draws: number; losses: number };
    } | null;
    homeRecent: H2HMatchRow[];
    awayRecent: H2HMatchRow[];
    matches: H2HMatchRow[];
  };
  homeForm: FormEntry[];
  awayForm: FormEntry[];
  lineups: {
    home: TeamLineup;
    away: TeamLineup;
  };
  odds: MatchOdds | null;
  groupTable: TableRow[] | null;
};

type PredictionSnapshot = {
  pick: string;
  predHome: number | null;
  predAway: number | null;
};

type Tab = 'match' | 'lineups' | 'odds' | 'h2h' | 'table';

type Props = {
  match: MatchSnapshot;
  locked: boolean;
  prediction?: PredictionSnapshot | null;
};

function formatStage(stage: string | null, groupName: string | null): string {
  if (groupName) return groupName.replace(/^GROUP_/, 'Group ');
  if (!stage) return 'World Cup';
  return stage
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusLabel(status: string, minute: number | null): string {
  if (status === 'IN_PLAY') return minute !== null ? `${minute}'` : 'Live';
  if (status === 'PAUSED') return 'HT';
  if (status === 'FINISHED') return 'FT';
  if (status === 'POSTPONED') return 'Postponed';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'SUSPENDED') return 'Suspended';
  return 'Scheduled';
}

function pickLabel(pick: string, home: string, away: string): string {
  if (pick === 'HOME') return home;
  if (pick === 'AWAY') return away;
  return 'Draw';
}

function hasScore(m: MatchSnapshot | MatchDetails): boolean {
  return (
    m.status === 'IN_PLAY' ||
    m.status === 'PAUSED' ||
    m.status === 'FINISHED'
  ) && m.homeScore !== null && m.awayScore !== null;
}

function FormDots({ form }: { form: FormEntry[] }) {
  if (form.length === 0) {
    return <span className="form-empty">—</span>;
  }

  return (
    <div className="form-dots">
      {form.map((f) => (
        <span key={`${f.date}-${f.opponent}`} className={`form-dot ${f.result.toLowerCase()}`} title={`${f.opponent} ${f.score}`}>
          {f.result}
        </span>
      ))}
    </div>
  );
}

function MatchTab({
  m,
  details,
  locked,
  prediction,
}: {
  m: MatchSnapshot | MatchDetails;
  details: MatchDetails | null;
  locked: boolean;
  prediction?: PredictionSnapshot | null;
}) {
  return (
    <>
      {details && (
        <div className="modal-form-row">
          <div>
            <span className="modal-form-label">{m.homeTeam}</span>
            <FormDots form={details.homeForm} />
          </div>
          <div className="modal-form-label muted">Form</div>
          <div>
            <span className="modal-form-label">{m.awayTeam}</span>
            <FormDots form={details.awayForm} />
          </div>
        </div>
      )}

      <section className="modal-section">
        <h4 className="modal-section-title">Match information</h4>
        <dl className="modal-facts">
          <div>
            <dt>Date</dt>
            <dd><LocalTime iso={m.startAt} mode="date" /></dd>
          </div>
          <div>
            <dt>Kickoff</dt>
            <dd><LocalTime iso={m.startAt} mode="time" /></dd>
          </div>
          <div>
            <dt>Stage</dt>
            <dd>{formatStage(m.stage, m.groupName)}</dd>
          </div>
          {details != null &&
            details.halfTimeHome !== null &&
            details.halfTimeAway !== null && (
            <div>
              <dt>Half time</dt>
              <dd>{details.halfTimeHome} : {details.halfTimeAway}</dd>
            </div>
          )}
          {details?.venue && (
            <div>
              <dt>Venue</dt>
              <dd>{details.venue}</dd>
            </div>
          )}
          {details?.referee && (
            <div>
              <dt>Referee</dt>
              <dd>{details.referee}</dd>
            </div>
          )}
          <div>
            <dt>Predictions</dt>
            <dd>{locked ? 'Locked' : 'Open'}</dd>
          </div>
        </dl>
      </section>

      {prediction && (
        <div className="modal-prediction">
          <strong>Your prediction</strong>
          <span>
            {pickLabel(prediction.pick, m.homeTeam, m.awayTeam)}
            {prediction.predHome !== null && (
              <> ({prediction.predHome} : {prediction.predAway})</>
            )}
          </span>
        </div>
      )}
    </>
  );
}

function shortPosition(position: string | null): string {
  if (!position) return '';
  const map: Record<string, string> = {
    Goalkeeper: 'GK',
    'Centre-Back': 'CB',
    'Left-Back': 'LB',
    'Right-Back': 'RB',
    'Defensive Midfield': 'DM',
    'Central Midfield': 'CM',
    'Attacking Midfield': 'AM',
    'Left Midfield': 'LM',
    'Right Midfield': 'RM',
    'Left Winger': 'LW',
    'Right Winger': 'RW',
    'Centre-Forward': 'CF',
    Defender: 'DEF',
    Midfielder: 'MID',
    Attacker: 'ATT',
  };
  return map[position] ?? position.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase();
}

function LineupList({ players }: { players: LineupPlayer[] }) {
  if (players.length === 0) {
    return <p className="lineup-empty">Not announced yet</p>;
  }

  return (
    <ul className="lineup-list">
      {players.map((p) => (
        <li key={`${p.shirtNumber}-${p.name}`}>
          <span className="lineup-num">{p.shirtNumber ?? '–'}</span>
          <span className="lineup-name">{p.name}</span>
          {p.position && <span className="lineup-pos">{shortPosition(p.position)}</span>}
        </li>
      ))}
    </ul>
  );
}

function LineupsTab({
  m,
  details,
}: {
  m: MatchSnapshot | MatchDetails;
  details: MatchDetails | null;
}) {
  if (!details) {
    return <p className="modal-empty">Loading lineups…</p>;
  }

  const { home, away } = details.lineups;
  const hasLineups = home.lineup.length > 0 || away.lineup.length > 0;

  if (!hasLineups) {
    return (
      <p className="modal-empty">
        Starting lineups are not published yet. Check back closer to kickoff.
      </p>
    );
  }

  return (
    <div className="lineups-grid">
      <section className="lineup-panel">
        <header className="lineup-panel-head">
          {m.homeCrest && <img src={m.homeCrest} alt="" />}
          <div>
            <strong>{m.homeTeam}</strong>
            {home.formation && <span>{home.formation}</span>}
            {home.coach && <span className="lineup-coach">Coach: {home.coach}</span>}
          </div>
        </header>
        <h4 className="modal-section-title">Starting XI</h4>
        <LineupList players={home.lineup} />
        {home.bench.length > 0 && (
          <>
            <h4 className="modal-section-title">Substitutes</h4>
            <LineupList players={home.bench} />
          </>
        )}
      </section>

      <section className="lineup-panel">
        <header className="lineup-panel-head">
          {m.awayCrest && <img src={m.awayCrest} alt="" />}
          <div>
            <strong>{m.awayTeam}</strong>
            {away.formation && <span>{away.formation}</span>}
            {away.coach && <span className="lineup-coach">Coach: {away.coach}</span>}
          </div>
        </header>
        <h4 className="modal-section-title">Starting XI</h4>
        <LineupList players={away.lineup} />
        {away.bench.length > 0 && (
          <>
            <h4 className="modal-section-title">Substitutes</h4>
            <LineupList players={away.bench} />
          </>
        )}
      </section>
    </div>
  );
}

function OddsTab({
  m,
  details,
}: {
  m: MatchSnapshot | MatchDetails;
  details: MatchDetails | null;
}) {
  if (!details) {
    return <p className="modal-empty">Loading odds…</p>;
  }

  const { odds } = details;
  if (!odds || (odds.homeWin == null && odds.draw == null && odds.awayWin == null)) {
    return (
      <p className="modal-empty">
        1X2 odds are not available for this fixture yet.
      </p>
    );
  }

  const entries = [
    { key: '1', label: m.homeTeam, value: odds.homeWin },
    { key: 'X', label: 'Draw', value: odds.draw },
    { key: '2', label: m.awayTeam, value: odds.awayWin },
  ].filter((e) => e.value != null) as { key: string; label: string; value: number }[];

  const favorite = entries.reduce((min, e) => (e.value < min.value ? e : min), entries[0]);

  return (
    <>
      <p className="odds-intro">Match winner (1X2) — decimal odds</p>
      <div className="odds-grid">
        {entries.map((e) => (
          <div
            key={e.key}
            className={`odds-card${e.key === favorite.key ? ' favorite' : ''}`}
          >
            <span className="odds-key">{e.key}</span>
            <span className="odds-value">{e.value.toFixed(2)}</span>
            <span className="odds-label">{e.label}</span>
          </div>
        ))}
      </div>
      <p className="odds-note muted">
        Odds from football-data.org. For information only — not betting advice.
      </p>
    </>
  );
}

function matchResultForTeam(
  teamName: string,
  x: H2HMatchRow,
): 'W' | 'D' | 'L' | null {
  if (x.homeScore === null || x.awayScore === null) return null;
  const isHome = x.homeTeam === teamName;
  const gf = isHome ? x.homeScore : x.awayScore;
  const ga = isHome ? x.awayScore : x.homeScore;
  if (gf > ga) return 'W';
  if (gf < ga) return 'L';
  return 'D';
}

function RecentMatchList({
  teamName,
  matches,
}: {
  teamName: string;
  matches: H2HMatchRow[];
}) {
  if (matches.length === 0) {
    return <p className="modal-empty">No recent matches found.</p>;
  }

  return (
    <ul className="h2h-list">
      {matches.map((x) => {
        const result = matchResultForTeam(teamName, x);
        return (
          <li key={x.id} className="h2h-item">
            <div className="h2h-item-meta">
              <span>{x.competition ?? 'Recent match'}</span>
              <span className="h2h-item-meta-right">
                {result && <span className={`form-dot ${result.toLowerCase()}`}>{result}</span>}
                <LocalTime iso={x.date} mode="date" />
              </span>
            </div>
            <div className="h2h-item-row">
              <span className="h2h-side">
                {x.homeCrest && <img src={x.homeCrest} alt="" />}
                {x.homeTeam}
              </span>
              <span className="h2h-score">
                {x.homeScore !== null && x.awayScore !== null
                  ? `${x.homeScore} : ${x.awayScore}`
                  : '– : –'}
              </span>
              <span className="h2h-side away">
                {x.awayTeam}
                {x.awayCrest && <img src={x.awayCrest} alt="" />}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function H2HTab({ m, details }: { m: MatchSnapshot | MatchDetails; details: MatchDetails | null }) {
  if (!details) {
    return <p className="modal-empty">Loading head-to-head…</p>;
  }

  const { aggregates, homeRecent, awayRecent, matches } = details.h2h;

  return (
    <>
      <section className="h2h-section">
        <h4 className="modal-section-title">Last matches — {m.homeTeam}</h4>
        <RecentMatchList teamName={m.homeTeam} matches={homeRecent} />
      </section>

      <section className="h2h-section">
        <h4 className="modal-section-title">Last matches — {m.awayTeam}</h4>
        <RecentMatchList teamName={m.awayTeam} matches={awayRecent} />
      </section>

      <section className="h2h-section">
        <h4 className="modal-section-title">Head-to-head — {m.homeTeam} vs {m.awayTeam}</h4>

        {aggregates && aggregates.numberOfMatches > 0 && (
          <div className="h2h-summary">
            <div className="h2h-team">
              <strong>{m.homeTeam}</strong>
              <span>{aggregates.homeTeam.wins}W · {aggregates.homeTeam.draws}D · {aggregates.homeTeam.losses}L</span>
            </div>
            <div className="h2h-mid">{aggregates.numberOfMatches} matches · {aggregates.totalGoals} goals</div>
            <div className="h2h-team away">
              <strong>{m.awayTeam}</strong>
              <span>{aggregates.awayTeam.wins}W · {aggregates.awayTeam.draws}D · {aggregates.awayTeam.losses}L</span>
            </div>
          </div>
        )}

        {matches.length === 0 ? (
          <p className="modal-empty">No previous meetings found.</p>
        ) : (
          <RecentMatchList teamName={m.homeTeam} matches={matches} />
        )}
      </section>
    </>
  );
}

function TableTab({ m, details }: { m: MatchSnapshot | MatchDetails; details: MatchDetails | null }) {
  if (!details) {
    return <p className="modal-empty">Loading standings…</p>;
  }

  if (!details.groupTable || details.groupTable.length === 0) {
    return (
      <p className="modal-empty">
        No group table for {formatStage(m.stage, m.groupName)}.
      </p>
    );
  }

  return (
    <div className="table-wrap modal-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th className="num">P</th>
            <th className="num">W</th>
            <th className="num">D</th>
            <th className="num">L</th>
            <th className="num">GD</th>
            <th className="num">Pts</th>
          </tr>
        </thead>
        <tbody>
          {details.groupTable.map((row) => {
            const highlight = row.team === m.homeTeam || row.team === m.awayTeam;
            return (
              <tr key={row.team} className={highlight ? 'table-highlight' : undefined}>
                <td className="num">{row.position}</td>
                <td>
                  <span className="table-team">
                    {row.crest && <img src={row.crest} alt="" />}
                    {row.team}
                  </span>
                </td>
                <td className="num">{row.played}</td>
                <td className="num">{row.won}</td>
                <td className="num">{row.draw}</td>
                <td className="num">{row.lost}</td>
                <td className="num">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                <td className="num total">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MatchDetailsModal({ match, locked, prediction }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('match');
  const [details, setDetails] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetails(null);
    setTab('match');

    fetch(`/api/matches/${match.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Could not load match details');
        if (!cancelled) setDetails(data as MatchDetails);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load match details');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, match.id]);

  const m = details ?? match;
  const live = m.status === 'IN_PLAY' || m.status === 'PAUSED';
  const minute = details?.minute ?? null;
  const scored = hasScore(m);

  return (
    <>
      <button type="button" className="details-btn" onClick={() => setOpen(true)}>
        Match
      </button>

      {open && (
        <div className="modal-overlay" onClick={close} role="presentation">
          <div
            className="modal modal-match"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`match-title-${match.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-hero">
              <div className="modal-hero-top">
                <p className="modal-breadcrumb">
                  {details?.competition ?? 'FIFA World Cup'} · {formatStage(m.stage, m.groupName)}
                </p>
                <button type="button" className="modal-close" onClick={close} aria-label="Close">
                  ×
                </button>
              </div>

              <p className="modal-kickoff-date"><LocalTime iso={m.startAt} mode="date" /></p>

              <h3 id={`match-title-${match.id}`} className="modal-scoreboard-lg">
                <div className="modal-team-lg">
                  {m.homeCrest && <img src={m.homeCrest} alt="" />}
                  <span className="modal-team-name">{m.homeTeam}</span>
                  {details?.homeTla && <span className="modal-team-tla">{details.homeTla}</span>}
                </div>

                <div className="modal-center-lg">
                  {scored ? (
                    <span className={`modal-score-lg ${live ? 'live' : ''}`}>
                      {m.homeScore} : {m.awayScore}
                    </span>
                  ) : (
                    <span className="modal-time-lg">
                      <LocalTime iso={m.startAt} mode="time" />
                    </span>
                  )}
                  <span className="modal-status-lg" data-live={live || undefined}>
                    {statusLabel(m.status, minute)}
                  </span>
                </div>

                <div className="modal-team-lg away">
                  {m.awayCrest && <img src={m.awayCrest} alt="" />}
                  <span className="modal-team-name">{m.awayTeam}</span>
                  {details?.awayTla && <span className="modal-team-tla">{details.awayTla}</span>}
                </div>
              </h3>
            </header>

            <nav className="modal-tabs" aria-label="Match sections">
              {([
                ['match', 'Match'],
                ['lineups', 'Lineups'],
                ['odds', 'Odds'],
                ['h2h', 'H2H'],
                ['table', 'Table'],
              ] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`modal-tab${tab === id ? ' active' : ''}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="modal-body modal-body-scroll">
              {loading && <p className="modal-hint">Loading match centre…</p>}
              {error && <p className="modal-error">{error}</p>}

              {tab === 'match' && (
                <MatchTab m={m} details={details} locked={locked} prediction={prediction} />
              )}
              {tab === 'lineups' && <LineupsTab m={m} details={details} />}
              {tab === 'odds' && <OddsTab m={m} details={details} />}
              {tab === 'h2h' && <H2HTab m={m} details={details} />}
              {tab === 'table' && <TableTab m={m} details={details} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
