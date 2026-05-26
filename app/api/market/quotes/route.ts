import { NextResponse } from 'next/server';
import { DEFAULT_WATCHLIST, type Quote } from '@/lib/market';

export const dynamic = 'force-dynamic';

const NAME_MAP: Record<string, string> = {
  AAPL: 'Apple Inc.', MSFT: 'Microsoft Corp.', GOOGL: 'Alphabet Inc.', AMZN: 'Amazon.com Inc.',
  META: 'Meta Platforms', NVDA: 'NVIDIA Corp.', TSLA: 'Tesla Inc.', SPY: 'SPDR S&P 500 ETF',
  QQQ: 'Invesco QQQ Trust', DIA: 'SPDR Dow Jones ETF', TLT: 'iShares 20+ Year Treasury Bond ETF',
  IEF: 'iShares 7-10 Year Treasury Bond ETF', SHY: 'iShares 1-3 Year Treasury Bond ETF',
  VIX: 'CBOE Volatility Index', '^VIX': 'CBOE Volatility Index',
};

const MOCK_BASE: Record<string, number> = {
  AAPL: 232.5, MSFT: 425.1, GOOGL: 178.6, AMZN: 215.3, META: 595.8, NVDA: 138.2,
  TSLA: 248.7, SPY: 575.2, QQQ: 495.4, DIA: 432.1, TLT: 88.7, IEF: 92.5, SHY: 82.1, VIX: 15.4, '^VIX': 15.4,
};

function yahooSymbol(symbol: string) {
  return symbol === 'VIX' ? '^VIX' : symbol;
}

function displaySymbol(symbol: string) {
  return symbol === '^VIX' ? 'VIX' : symbol;
}

function sparkline(symbol: string, base: number): number[] {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 7 }, (_, i) => {
    const wave = Math.sin((Date.now() / 86_400_000) + seed + i * 0.9) * 0.012 + Math.cos(seed * 0.3 + i) * 0.006;
    return +(base * (1 + wave)).toFixed(2);
  });
}

function mockQuote(symbol: string): Quote {
  const sym = displaySymbol(symbol);
  const base = MOCK_BASE[sym] ?? MOCK_BASE[symbol] ?? 100;
  const values = sparkline(sym, base);
  const price = values[values.length - 1];
  const prev = values[values.length - 2] || base;
  const change = +(price - prev).toFixed(2);
  const changePct = prev ? +((change / prev) * 100).toFixed(2) : 0;
  return { symbol: sym, name: NAME_MAP[sym] ?? sym, price, change, changePct, volume: Math.round(1_000_000 + Math.abs(changePct) * 500_000), currency: 'USD', ts: Date.now(), sparkline: values, mock: true };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get('symbols') || DEFAULT_WATCHLIST.join(','))
    .split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 40);
  const symbols = raw.length ? raw : DEFAULT_WATCHLIST;
  const yahooSymbols = symbols.map(yahooSymbol);
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbols.join(','))}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (president-sim/market)', Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const data = await res.json();
    const arr: any[] = data?.quoteResponse?.result ?? [];
    if (!arr.length) throw new Error('Yahoo empty result');
    const byYahoo = new Map<string, Quote>();
    for (const q of arr) {
      const display = displaySymbol(String(q.symbol));
      const price = Number(q.regularMarketPrice ?? q.postMarketPrice ?? 0);
      const change = Number(q.regularMarketChange ?? 0);
      const prev = Number(q.regularMarketPreviousClose ?? ((price - change) || price));
      const baseSpark = sparkline(display, prev || price || MOCK_BASE[display] || 100);
      byYahoo.set(String(q.symbol), {
        symbol: display,
        name: q.shortName ?? q.longName ?? NAME_MAP[display] ?? display,
        price,
        change,
        changePct: Number(q.regularMarketChangePercent ?? (prev ? (change / prev) * 100 : 0)),
        volume: Number(q.regularMarketVolume ?? 0),
        currency: q.currency ?? 'USD',
        ts: Date.now(),
        sparkline: [...baseSpark.slice(0, 6), +price.toFixed(2)],
      });
    }
    return NextResponse.json({ quotes: symbols.map((s) => byYahoo.get(yahooSymbol(s)) ?? mockQuote(s)) });
  } catch (error) {
    console.error('[api/market/quotes] mock fallback', error);
    return NextResponse.json({ quotes: symbols.map(mockQuote), mock: true });
  }
}
