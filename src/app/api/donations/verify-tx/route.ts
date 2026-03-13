import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validates a Monero transaction ID against the public xmrchain.net explorer.
// Returns { valid: boolean, confirmations: number }.
// Requires at least 1 confirmation before allowing leaderboard submission.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { txId } = body ?? {};

    // Monero txids are exactly 64 hex characters
    if (typeof txId !== 'string' || !/^[0-9a-fA-F]{64}$/.test(txId)) {
      return NextResponse.json({ error: 'Invalid transaction ID format. Must be a 64-character hex string.' }, { status: 400 });
    }

    const explorerRes = await fetch(`https://xmrchain.net/api/transaction/${txId}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!explorerRes.ok) {
      return NextResponse.json({ valid: false, confirmations: 0, error: 'Transaction not found on blockchain.' }, { status: 404 });
    }

    const data = await explorerRes.json();

    if (data?.status?.code !== 200 || !data?.data) {
      return NextResponse.json({ valid: false, confirmations: 0, error: data?.status?.error ?? 'Transaction not found.' }, { status: 404 });
    }

    const confirmations: number = data.data.confirmations ?? 0;
    const valid = confirmations >= 1;

    return NextResponse.json({ valid, confirmations, txHash: data.data.tx_hash ?? txId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Explorer unreachable.';
    return NextResponse.json({ valid: false, confirmations: 0, error: msg }, { status: 503 });
  }
}
