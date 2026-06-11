'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PickValue = 'HOME' | 'DRAW' | 'AWAY';

type Props = {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  locked: boolean;
  initialPick: PickValue | null;
  initialHome: number | null;
  initialAway: number | null;
};

function derivePick(h: string, a: string): PickValue | null {
  if (h === '' || a === '') return null;
  const home = Number(h);
  const away = Number(a);
  if (home > away) return 'HOME';
  if (home < away) return 'AWAY';
  return 'DRAW';
}

export function PredictionForm({
  matchId, homeTeam, awayTeam, locked, initialPick, initialHome, initialAway,
}: Props) {
  const router = useRouter();
  const [pick, setPick] = useState<PickValue | null>(initialPick);
  const [home, setHome] = useState(initialHome === null ? '' : String(initialHome));
  const [away, setAway] = useState(initialAway === null ? '' : String(initialAway));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const scorePick = derivePick(home, away);
  const effectivePick = scorePick ?? pick;
  const dirty =
    effectivePick !== initialPick ||
    (home === '' ? null : Number(home)) !== initialHome ||
    (away === '' ? null : Number(away)) !== initialAway;

  function setScore(side: 'home' | 'away', value: string) {
    const clean = value.replace(/\D/g, '').slice(0, 2);
    if (side === 'home') setHome(clean); else setAway(clean);
    const next = derivePick(side === 'home' ? clean : home, side === 'away' ? clean : away);
    if (next) setPick(next);
    setMsg(null);
  }

  async function save() {
    if (!effectivePick) {
      setMsg({ kind: 'err', text: 'Pick a result first.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, pick: effectivePick, predHome: home, predAway: away }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save prediction.');
      setMsg({ kind: 'ok', text: 'Prediction saved.' });
      router.refresh();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Could not save prediction.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="predict">
      <div className="pick-buttons" role="group" aria-label="Match result prediction">
        {([
          ['HOME', `${homeTeam} win`],
          ['DRAW', 'Draw'],
          ['AWAY', `${awayTeam} win`],
        ] as [PickValue, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`pick-btn${effectivePick === value ? ' selected' : ''}`}
            disabled={locked || saving || (scorePick !== null && scorePick !== value)}
            onClick={() => { setPick(value); setMsg(null); }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="score-inputs">
        <label htmlFor={`h-${matchId}`}>Exact score (optional, worth 3 pts):</label>
        <input
          id={`h-${matchId}`}
          inputMode="numeric"
          aria-label={`${homeTeam} goals`}
          placeholder="–"
          value={home}
          disabled={locked || saving}
          onChange={(e) => setScore('home', e.target.value)}
        />
        <span className="muted">:</span>
        <input
          inputMode="numeric"
          aria-label={`${awayTeam} goals`}
          placeholder="–"
          value={away}
          disabled={locked || saving}
          onChange={(e) => setScore('away', e.target.value)}
        />
      </div>

      {!locked && (
        <div className="predict-footer">
          <button type="button" className="save-btn" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : initialPick ? 'Update prediction' : 'Save prediction'}
          </button>
          {msg && <span className={`form-msg ${msg.kind}`}>{msg.text}</span>}
        </div>
      )}
    </div>
  );
}
