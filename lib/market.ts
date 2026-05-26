// 市场行情数据层：客户端调用本应用 API，Route Handler 负责外部数据源与 mock fallback。

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  currency: string;
  ts: number;
  sparkline: number[];
  mock?: boolean;
};

export type RateSeriesPoint = { date: string; value: number };
export type RateSeries = { id: string; name: string; unit: string; points: RateSeriesPoint[]; mock?: boolean };
export type RatePoint = { id: string; name: string; value: number; unit: string; date: string; mock?: boolean };

export const MARKET_WATCHLIST_LS_KEY = 'presidentSim.marketWatchlist.v1';

export const DEFAULT_WATCHLIST: string[] = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  'SPY', 'QQQ', 'DIA', 'TLT', 'IEF', 'SHY', 'VIX',
];

async function readJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  if (!symbols.length) return [];
  const params = new URLSearchParams({ symbols: symbols.join(',') });
  const data = await readJson<{ quotes: Quote[] }>(`/api/market/quotes?${params.toString()}`);
  return data.quotes;
}

export async function fetchRates(): Promise<RatePoint[]> {
  const data = await readJson<{ series: RateSeries[] }>('/api/market/rates');
  return data.series.map((s) => {
    const last = s.points[s.points.length - 1];
    return { id: s.id, name: s.name, value: last?.value ?? 0, unit: s.unit, date: last?.date ?? 'n/a', mock: s.mock };
  });
}

export async function fetchRateSeries(): Promise<RateSeries[]> {
  const data = await readJson<{ series: RateSeries[] }>('/api/market/rates');
  return data.series;
}
