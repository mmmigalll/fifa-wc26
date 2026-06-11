import type { Pick } from '@prisma/client';

/** Predictions lock this many hours before kickoff. */
export const LOCK_HOURS = 2;

export const POINTS_EXACT_SCORE = 3;
export const POINTS_CORRECT_OUTCOME = 1;

export function lockTime(startAt: Date): Date {
  return new Date(startAt.getTime() - LOCK_HOURS * 60 * 60 * 1000);
}

export function isLocked(startAt: Date, now: Date = new Date()): boolean {
  return now >= lockTime(startAt);
}

export function outcomeFromScore(home: number, away: number): Pick {
  if (home > away) return 'HOME';
  if (home < away) return 'AWAY';
  return 'DRAW';
}

/**
 * Rule 4 + 5:
 *  - exact score guessed  -> 3 points (already implies the correct outcome)
 *  - outcome guessed only -> 1 point
 *  - otherwise            -> 0 points
 */
export function calculatePoints(
  prediction: { pick: Pick; predHome: number | null; predAway: number | null },
  result: { homeScore: number; awayScore: number },
): number {
  const exact =
    prediction.predHome !== null &&
    prediction.predAway !== null &&
    prediction.predHome === result.homeScore &&
    prediction.predAway === result.awayScore;

  if (exact) return POINTS_EXACT_SCORE;

  const actualOutcome = outcomeFromScore(result.homeScore, result.awayScore);
  return prediction.pick === actualOutcome ? POINTS_CORRECT_OUTCOME : 0;
}
