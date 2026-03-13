import { NextRequest, NextResponse } from 'next/server';
import { getUsers } from '@/lib/store';
import { verifyPassword, issueToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body ?? {};

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 });
    }

    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      // Constant-time: still run verification to prevent timing-based enumeration
      await verifyPassword(password, 'aaaa:bbbb');
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, token: issueToken(user.id), username: user.username });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
