import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isLocked, LOCK_HOURS, lockTime } from '@/lib/scoring';
import { PredictionForm } from '@/components/PredictionForm';
import { LocalTime } from '@/components/LocalTime';
import { MatchDetailsModal } from '@/components/MatchDetailsModal';

export const dynamic = 'force-dynamic';

const pickLabel = (pick: string, home: string, away: string) =>
  pick === 'HOME' ? home : pick === 'AWAY' ? away : 'Draw';

export default async function MatchesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const matches = await prisma.match.findMany({
    orderBy: { startAt: 'asc' },
    include: { predictions: { where: { userId: session.userId } } },
  });

  const now = new Date();
  const past = matches
    .filter((m) => m.status === 'FINISHED' || m.status === 'CANCELLED')
    .reverse(); // most recent first
  const upcoming = matches.filter((m) => m.status !== 'FINISHED' && m.status !== 'CANCELLED');

  return (
    <>
      {/* Requirement 3: clarify the prediction deadline */}
      <div className="banner" role="note">
        <strong>Deadline rule</strong>
        <span>
          Predictions lock <b>{LOCK_HOURS} hours before kickoff</b>. Exact score earns{' '}
          <b>3 points</b>, correct outcome alone earns <b>1 point</b>.
        </span>
      </div>

      <h2 className="section-title">Upcoming matches</h2>
      {upcoming.length === 0 && (
        <p className="empty">No upcoming fixtures yet. They appear automatically once the sync job runs.</p>
      )}
      {upcoming.map((m) => {
        const locked = isLocked(m.startAt, now);
        const p = m.predictions[0] ?? null;
        const live = m.status === 'IN_PLAY' || m.status === 'PAUSED';
        return (
          <article className="match-card" key={m.id}>
            <div className="match-meta">
              <span>
                {m.groupName ?? m.stage?.replaceAll('_', ' ').toLowerCase()} · <LocalTime iso={m.startAt.toISOString()} />
              </span>
              <div className="match-meta-actions">
                <MatchDetailsModal
                  match={{
                    id: m.id,
                    homeTeam: m.homeTeam,
                    awayTeam: m.awayTeam,
                    homeCrest: m.homeCrest,
                    awayCrest: m.awayCrest,
                    stage: m.stage,
                    groupName: m.groupName,
                    startAt: m.startAt.toISOString(),
                    status: m.status,
                    homeScore: m.homeScore,
                    awayScore: m.awayScore,
                  }}
                  locked={locked}
                  prediction={p ? { pick: p.pick, predHome: p.predHome, predAway: p.predAway } : null}
                />
                <span className={`status-chip ${locked ? 'locked' : 'open'}`}>
                  {live ? 'Live' : locked ? 'Locked' : 'Open'}
                </span>
              </div>
            </div>
            <div className="match-row">
              <div className="team">
                {m.homeCrest && <img src={m.homeCrest} alt="" />}
                <span>{m.homeTeam}</span>
              </div>
              <div className={`scoreboard ${live ? 'live' : 'upcoming'}`}>
                {live && m.homeScore !== null
                  ? `${m.homeScore} : ${m.awayScore}`
                  : <LocalTime iso={m.startAt.toISOString()} mode="time" />}
              </div>
              <div className="team away">
                <span>{m.awayTeam}</span>
                {m.awayCrest && <img src={m.awayCrest} alt="" />}
              </div>
            </div>

            {locked ? (
              <p className="my-pick">
                {p ? (
                  <>Your pick: <b>{pickLabel(p.pick, m.homeTeam, m.awayTeam)}</b>
                    {p.predHome !== null && <> ({p.predHome} : {p.predAway})</>}</>
                ) : (
                  <>No prediction — closed <LocalTime iso={lockTime(m.startAt).toISOString()} />.</>
                )}
              </p>
            ) : (
              <PredictionForm
                matchId={m.id}
                homeTeam={m.homeTeam}
                awayTeam={m.awayTeam}
                locked={false}
                initialPick={p?.pick ?? null}
                initialHome={p?.predHome ?? null}
                initialAway={p?.predAway ?? null}
              />
            )}
          </article>
        );
      })}

      <h2 className="section-title">Past matches</h2>
      {past.length === 0 && <p className="empty">No finished matches yet.</p>}
      {past.map((m) => {
        const p = m.predictions[0] ?? null;
        return (
          <article className="match-card" key={m.id}>
            <div className="match-meta">
              <span>
                {m.groupName ?? m.stage?.replaceAll('_', ' ').toLowerCase()} · <LocalTime iso={m.startAt.toISOString()} />
              </span>
              <span className="status-chip finished">Full time</span>
            </div>
            <div className="match-row">
              <div className="team">
                {m.homeCrest && <img src={m.homeCrest} alt="" />}
                <span>{m.homeTeam}</span>
              </div>
              <div className="scoreboard">
                {m.homeScore !== null ? `${m.homeScore} : ${m.awayScore}` : '— : —'}
              </div>
              <div className="team away">
                <span>{m.awayTeam}</span>
                {m.awayCrest && <img src={m.awayCrest} alt="" />}
              </div>
            </div>
            <p className="my-pick">
              {p ? (
                <>
                  Your pick: <b>{pickLabel(p.pick, m.homeTeam, m.awayTeam)}</b>
                  {p.predHome !== null && <> ({p.predHome} : {p.predAway})</>}
                  {p.points !== null && (
                    <span className={`points-pill p${p.points === 3 ? 3 : p.points === 1 ? 1 : 0}`}>
                      +{p.points} pts
                    </span>
                  )}
                </>
              ) : (
                'You did not predict this match.'
              )}
            </p>
          </article>
        );
      })}
    </>
  );
}
