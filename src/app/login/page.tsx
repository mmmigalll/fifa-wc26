'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not send the code.');
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not verify the code.');
      router.push('/matches');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-card">
      <h1>Sign in</h1>
      {step === 'email' ? (
        <>
          <p>Enter your email — a 6-digit login code arrives in your inbox.</p>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && email && requestCode()}
          />
          <button className="save-btn" onClick={requestCode} disabled={busy || !email}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </>
      ) : (
        <>
          <p>Code sent to <b>{email}</b>. It expires in 10 minutes.</p>
          <input
            className="code"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            value={code}
            autoFocus
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()}
          />
          <button className="save-btn" onClick={verify} disabled={busy || code.length !== 6}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <button className="login-alt" onClick={() => { setStep('email'); setCode(''); setError(null); }}>
            Use a different email or resend the code
          </button>
        </>
      )}
      {error && <p className="form-msg err" role="alert">{error}</p>}
    </div>
  );
}
