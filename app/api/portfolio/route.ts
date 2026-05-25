import { NextResponse } from 'next/server';
import { loadPortfolio, computeKpis } from '@/lib/portfolio';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pf = loadPortfolio();
  return NextResponse.json({ portfolio: pf, kpis: computeKpis(pf) });
}
