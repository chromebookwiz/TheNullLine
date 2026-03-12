import { NextResponse } from 'next/server';
import { getDonations } from '@/lib/store';

// Aggregate donations by user and return top 20
export async function GET() {
  const donations = getDonations();

  // Sum amounts per user
  const totals = new Map<string, { username: string; total: number; lastDate: string }>();
  for (const d of donations) {
    const existing = totals.get(d.userId);
    if (existing) {
      existing.total += d.xmrAmount;
      if (d.createdAt > existing.lastDate) existing.lastDate = d.createdAt;
    } else {
      totals.set(d.userId, { username: d.username, total: d.xmrAmount, lastDate: d.createdAt });
    }
  }

  const leaderboard = [...totals.entries()]
    .map(([userId, v]) => ({ userId, username: v.username, totalXmr: v.total, lastDate: v.lastDate }))
    .sort((a, b) => b.totalXmr - a.totalXmr)
    .slice(0, 20);

  return NextResponse.json({ leaderboard });
}
