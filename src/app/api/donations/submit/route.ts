import { NextRequest, NextResponse } from 'next/server';
import { getDonations, saveDonations, getUsers, Donation } from '@/lib/store';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Auth: Bearer token in Authorization header
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const userId = verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }

    const body = await req.json();
    const { txId, xmrAmount, note } = body ?? {};

    if (typeof txId !== 'string' || txId.length < 10 || txId.length > 200) {
      return NextResponse.json({ error: 'Invalid Monero transaction ID.' }, { status: 400 });
    }
    const amount = Number(xmrAmount);
    if (!isFinite(amount) || amount <= 0 || amount > 1e6) {
      return NextResponse.json({ error: 'Invalid XMR amount.' }, { status: 400 });
    }
    const safeNote = typeof note === 'string' ? note.slice(0, 280) : '';

    const donation: Donation = {
      id: crypto.randomUUID(),
      userId,
      username: user.username,
      xmrAmount: amount,
      txId: txId.trim(),
      note: safeNote,
      createdAt: new Date().toISOString(),
    };

    saveDonations([...getDonations(), donation]);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
