// 美股 / 美债 行情数据层
// 优先免 key 的 Yahoo Finance 非官方端点;失败 fallback 到 mock。
// 注:这是 server-side 拉取(Next.js Route Handler 调用),浏览器不直接访问外站,避免 CORS。

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;        // 绝对涨跌
  changePct: number;     // 百分比 (eg. -1.23 = -1.23%)
  volume: number;
  currency: string;
  ts: number;            // 毫秒
  mock?: boolean;
};

export const DEFAULT_WATCHLIST: string[] = [
  // 美股核心
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  // 大盘 ETF
  'SPY', 'QQQ', 'DIA',
  // 美债 ETF
  'TLT', 'IEF', 'SHY',
  // 波动率
  '^VIX',
];

const NAME_MAP: Record<string, string> = {
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corp.',
  GOOGL: 'Alphabet Inc.',
  AMZN: 'Amazon.com Inc.',
  META: 'Meta Platforms',
  NVDA: 'NVIDIA Corp.',
  TSLA: 'Tesla Inc.',
  SPY: 'SPDR S&P 500 ETF',
  QQQ: 'Invesco QQQ Trust',
  DIA: 'SPDR Dow Jones ETF',
  TLT: 'iShares 20+ Year Treasury Bond ETF',
  IEF: 'iShares 7-10 Year Treasury Bond ETF',
  SHY: 'iShares 1-3 Year Treasury Bond ETF',
  '^VIX': 'CBOE Volatility Index',
};

// 静态参考价(mock 基线)
const MOCK_BASE: Record<string, number> = {
  AAPL: 232.5, MSFT: 425.1, GOOGL: 178.6, AMZN: 215.3, META: 595.8,
  NVDA: 138.2, TSLA: 248.7, SPY: 575.2, QQQ: 495.4, DIA: 432.1,
  TLT: 88.7, IEF: 92.5, SHY: 82.1, '^VIX': 15.4,
};

function mockQuote(sym: string): Quote {
  const base = MOCK_BASE[sym] ?? 100;
  // 用时间+symbol 生成稳定但缓慢漂移的"波动"
  const seed = (Date.now() / 60000 | 0) + sym.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const noise = ((Math.sin(seed) + Math.cos(seed * 1.7)) / 2) * 0.012; // ±1.2%
  const price = +(base * (1 + noise)).toFixed(2);
  const change = +(price - base).toFixed(2);
  const changePct = +(noise * 100).toFixed(2);
  return {
    symbol: sym,
    name: NAME_MAP[sym] ?? sym,
    price,
    change,
    changePct,
    volume: Math.round(1_000_000 * (1 + Math.abs(noise) * 10)),
    currency: 'USD',
    ts: Date.now(),
    mock: true,
  };
}

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // Yahoo 非官方端点对 UA 比较敏感
        'User-Agent': 'Mozilla/5.0 (president-sim/0.3)',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    const arr: any[] = data?.quoteResponse?.result ?? [];
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('empty result');
    const got = new Map<string, Quote>();
    for (const q of arr) {
      const sym: string = q.symbol;
      got.set(sym, {
        symbol: sym,
        name: q.shortName ?? q.longName ?? NAME_MAP[sym] ?? sym,
        price: Number(q.regularMarketPrice ?? 0),
        change: Number(q.regularMarketChange ?? 0),
        changePct: Number(q.regularMarketChangePercent ?? 0),
        volume: Number(q.regularMarketVolume ?? 0),
        currency: q.currency ?? 'USD',
        ts: Date.now(),
      });
    }
    // 缺失的 symbol 用 mock 补
    return symbols.map((s) => got.get(s) ?? mockQuote(s));
  } catch (e) {
    console.error('[market.fetchQuotes] fallback to mock:', (e as Error).message);
    return symbols.map(mockQuote);
  } finally {
    clearTimeout(t);
  }
}

// ---- 利率 ----
export type RatePoint = { id: string; name: string; value: number; unit: string; date: string; mock?: boolean };

const RATE_SERIES: { id: string; name: string }[] = [
  { id: 'DFF',     name: '联邦基金有效利率 (EFFR)' },
  { id: 'DGS10',   name: '10年期美债收益率' },
  { id: 'DGS2',    name: '2年期美债收益率' },
  { id: 'AAA',     name: '穆迪企业债 AAA 收益率' },
];

const RATE_MOCK: Record<string, number> = {
  DFF: 4.83, DGS10: 4.25, DGS2: 4.05, AAA: 5.18,
};

async function fetchOneFred(id: string): Promise<{ value: number; date: string } | null> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'president-sim/0.3' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    for (let i = lines.length - 1; i >= 1; i--) {
      const [date, val] = lines[i].split(',');
      const n = Number(val);
      if (Number.isFinite(n)) return { date, value: n };
    }
    return null;
  } catch (e) {
    console.error(`[market.fred:${id}]`, (e as Error).message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchRates(): Promise<RatePoint[]> {
  const today = new Date().toISOString().slice(0, 10);
  const results = await Promise.all(RATE_SERIES.map(async (s) => {
    const r = await fetchOneFred(s.id);
    if (r) return { id: s.id, name: s.name, value: +r.value.toFixed(2), unit: '%', date: r.date };
    return { id: s.id, name: s.name, value: RATE_MOCK[s.id], unit: '%', date: today, mock: true };
  }));
  return results;
}

// 收益率曲线(2y, 3y, 5y, 7y, 10y, 30y),失败用 mock
export type CurvePoint = { tenor: string; years: number; yieldPct: number; mock?: boolean };

const CURVE_DEF: { tenor: string; years: number; id: string; mockYield: number }[] = [
  { tenor: '2Y',  years: 2,  id: 'DGS2',  mockYield: 4.05 },
  { tenor: '3Y',  years: 3,  id: 'DGS3',  mockYield: 4.10 },
  { tenor: '5Y',  years: 5,  id: 'DGS5',  mockYield: 4.15 },
  { tenor: '7Y',  years: 7,  id: 'DGS7',  mockYield: 4.20 },
  { tenor: '10Y', years: 10, id: 'DGS10', mockYield: 4.25 },
  { tenor: '30Y', years: 30, id: 'DGS30', mockYield: 4.55 },
];

export async function fetchYieldCurve(): Promise<CurvePoint[]> {
  const results = await Promise.all(CURVE_DEF.map(async (c) => {
    const r = await fetchOneFred(c.id);
    if (r) return { tenor: c.tenor, years: c.years, yieldPct: +r.value.toFixed(2) };
    return { tenor: c.tenor, years: c.years, yieldPct: c.mockYield, mock: true };
  }));
  return results;
}
