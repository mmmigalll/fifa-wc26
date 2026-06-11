import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { LocalTime } from '@/components/LocalTime';
import { isLocked, POINTS_CORRECT_OUTCOME, POINTS_EXACT_SCORE } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

const pickLabel = (pick: string, home: string, away: string) =>
  pick === 'HOME' ? home : pick === 'AWAY' ? away : 'Draw';

const reason = (points: number | null) =>
  points === POINTS_EXACT_SCORE ? 'Exact score'
  : points === POINTS_CORRECT_OUTCOME ? 'Correct outcome'
  : points === 0 ? 'Missed'
  : 'Pending';

export default async function UserBreakdownPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      predictions: {
        include: { match: true },
        orderBy: { match: { startAt: 'desc' } },
      },
    },
  });
  if (!user) notFound();

  // Only show picks for matches that are already locked or finished —
  // open predictions stay private so nobody can copy them.
  const visible = user.predictions.filter(
    (p) => p.match.status === 'FINISHED' || isLocked(p.match.startAt),
  );
  const scored = visible.filter((p) => p.points !== null);
  const total = scored.reduce((sum, p) => sum + (p.points ?? 0), 0);

  const name = user.name ?? user.email.split('@')[0];

  return (
    <>
      <h2 className="section-title">{name} — point breakdown</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Total: <b>{total} points</b> from {scored.length} scored prediction{scored.length === 1 ? '' : 's'}.
        Rules: exact score = {POINTS_EXACT_SCORE} pts, correct outcome = {POINTS_CORRECT_OUTCOME} pt.
        Picks for still-open matches are hidden.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Match</th>
              <th>Kickoff</th>
              <th>Pick</th>
              <th className="num">Predicted</th>
              <th className="num">Final</th>
              <th>Why</th>
              <th className="num">Points</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id}>
                <td>{p.match.homeTeam} – {p.match.awayTeam}</td>
                <td><LocalTime iso={p.match.startAt.toISOString()} /></td>
                <td>{pickLabel(p.pick, p.match.homeTeam, p.match.awayTeam)}</td>
                <td className="num">{p.predHome !== null ? `${p.predHome} : ${p.predAway}` : '—'}</td>
                <td className="num">
                  {p.match.homeScore !== null ? `${p.match.homeScore} : ${p.match.awayScore}` : '—'}
                </td>
                <td className="muted">{reason(p.points)}</td>
                <td className="num total">{p.points ?? '—'}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={7} className="empty">No locked or finished predictions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
