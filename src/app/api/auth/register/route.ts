import { NextRequest, NextResponse } from 'next/server';
import { getUsers, saveUsers, User } from '@/lib/store';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password } = body ?? {};

    // Basic input validation
    if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: 'Username must be 3–30 characters.' }, { status: 400 });
    }
    if (typeof email !== 'string' || !email.includes('@') || email.length > 120) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be 8–128 characters.' }, { status: 400 });
    }

    // Sanitise username: alphanumerics, hyphens, underscores only
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json({ error: 'Username may only contain letters, digits, _ and -.' }, { status: 400 });
    }

    const users = getUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
    }
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, newUser]);

    return NextResponse.json({ ok: true, username: newUser.username }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
