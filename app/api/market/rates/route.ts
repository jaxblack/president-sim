import { NextResponse } from 'next/server';
import type { RateSeries, RateSeriesPoint } from '@/lib/market';

export const dynamic = 'force-dynamic';

const SERIES = [
  { id: 'EFFR', name: '联邦基金有效利率 (EFFR)', mock: 5.33 },
  { id: 'DGS10', name: '10年期美债收益率', mock: 4.25 },
  { id: 'DGS2', name: '2年期美债收益率', mock: 4.05 },
];

function mockPoints(base: number): RateSeriesPoint[] {
  const now = Date.now();
  return Array.from({ length: 30 }, (_, i) => {
    const ts = now - (29 - i) * 86_400_000;
    const value = +(base + Math.sin(i / 4) * 0.08 + Math.cos(i / 7) * 0.04).toFixed(2);
    return { date: new Date(ts).toISOString().slice(0, 10), value };
  });
}

function parseFredCsv(text: string): RateSeriesPoint[] {
  return text.trim().split(/\r?\n/).slice(1).map((line) => {
    const [date, raw] = line.split(',');
    const value = Number(raw);
    return Number.isFinite(value) ? { date, value } : null;
  }).filter((x): x is RateSeriesPoint => Boolean(x)).slice(-30);
}

async function fetchFred(id: string): Promise<RateSeriesPoint[]> {
  const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, { headers: { 'User-Agent': 'president-sim/rates' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`${id} HTTP ${res.status}`);
  const points = parseFredCsv(await res.text());
  if (!points.length) throw new Error(`${id} empty`);
  return points;
}

export async function GET() {
  const series = await Promise.all(SERIES.map(async (s): Promise<RateSeries> => {
    try {
      return { id: s.id, name: s.name, unit: '%', points: await fetchFred(s.id) };
    } catch (error) {
      console.error('[api/market/rates] mock fallback', s.id, error);
      return { id: s.id, name: s.name, unit: '%', points: mockPoints(s.mock), mock: true };
    }
  }));
  return NextResponse.json({ series });
}
