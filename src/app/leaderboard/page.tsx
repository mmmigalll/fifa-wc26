import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const users = await prisma.user.findMany({
    include: { predictions: { where: { points: { not: null } } } },
  });

  const rows = users
    .map((u) => {
      const scored = u.predictions;
      return {
        id: u.id,
        name: u.name ?? u.email.split('@')[0],
        isMe: u.id === session.userId,
        total: scored.reduce((sum, p) => sum + (p.points ?? 0), 0),
        exact: scored.filter((p) => p.points === 3).length,
        outcome: scored.filter((p) => p.points === 1).length,
        predicted: scored.length,
      };
    })
    .sort((a, b) => b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name));

  return (
    <>
      <h2 className="section-title">Leaderboard</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Click a player to see how every point was earned.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Player</th>
              <th className="num">Exact (3 pts)</th>
              <th className="num">Outcome (1 pt)</th>
              <th className="num">Scored picks</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`clickable${i === 0 && r.total > 0 ? ' rank-1' : ''}`}>
                <td className="num">{i + 1}</td>
                <td>
                  <Link href={`/users/${r.id}`}>
                    {r.name}
                    {r.isMe && <span className="muted"> (you)</span>}
                  </Link>
                </td>
                <td className="num">{r.exact}</td>
                <td className="num">{r.outcome}</td>
                <td className="num">{r.predicted}</td>
                <td className="num total">{r.total}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="empty">No players yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
