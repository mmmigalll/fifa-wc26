import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateLoginCode, hashLoginCode } from '@/lib/auth';
import { sendLoginCode } from '@/lib/email';

const CODE_TTL_MIN = 10;
const MAX_CODES_PER_HOUR = 5;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  // Light rate limit: max 5 codes per email per hour.
  const recent = await prisma.loginCode.count({
    where: { email, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_CODES_PER_HOUR) {
    return NextResponse.json(
      { error: 'Too many codes requested. Try again in an hour.' },
      { status: 429 },
    );
  }

  const code = generateLoginCode();
  await prisma.loginCode.create({
    data: {
      email,
      codeHash: hashLoginCode(email, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000),
    },
  });

  await sendLoginCode(email, code);

  return NextResponse.json({ ok: true });
}
