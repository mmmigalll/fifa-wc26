'use client';

import { useEffect, useState } from 'react';

/** Renders an ISO timestamp in the viewer's local timezone (client-side only
 *  to avoid server/client hydration mismatch). */
export function LocalTime({ iso, mode = 'datetime' }: { iso: string; mode?: 'datetime' | 'time' }) {
  const [text, setText] = useState('');

  useEffect(() => {
    const d = new Date(iso);
    setText(
      mode === 'time'
        ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleString(undefined, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
    );
  }, [iso, mode]);

  return <span suppressHydrationWarning>{text || '…'}</span>;
}
