import { NextResponse } from 'next/server';
import { fetchAllFeeds } from '@/lib/aggregator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ items: await fetchAllFeeds() });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
