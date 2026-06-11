import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, hashLoginCode } from '@/lib/auth';

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const code = String(body?.code ?? '').trim();

  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code from your email.' }, { status: 400 });
  }

  const loginCode = await prisma.loginCode.findFirst({
    where: { email, consumedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!loginCode || loginCode.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Code expired or not found. Request a new one.' },
      { status: 400 },
    );
  }

  if (loginCode.codeHash !== hashLoginCode(email, code)) {
    await prisma.loginCode.update({
      where: { id: loginCode.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: 'Wrong code. Check your email and try again.' }, { status: 400 });
  }

  await prisma.loginCode.update({
    where: { id: loginCode.id },
    data: { consumedAt: new Date() },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: email.split('@')[0] },
  });

  await createSession({ userId: user.id, email: user.email });

  return NextResponse.json({ ok: true });
}
