import type { FeedItem } from '../aggregator';

const SERIES: { id: string; cn: string; unit: string; priority: 'high' | 'medium' | 'low' }[] = [
  { id: 'DGS10',    cn: '美国 10Y 国债收益率', unit: '%',     priority: 'high'   },
  { id: 'UNRATE',   cn: '美国失业率',          unit: '%',     priority: 'high'   },
  { id: 'CPIAUCSL', cn: '美国 CPI 指数',       unit: '',      priority: 'medium' },
];

async function fetchOne(s: (typeof SERIES)[number]): Promise<FeedItem | null> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${s.id}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'president-sim/0.2' },
      cache: 'force-cache',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    // 从尾部找第一条有效数值
    let last: { date: string; value: number } | null = null;
    for (let i = lines.length - 1; i >= 1; i--) {
      const [date, val] = lines[i].split(',');
      const n = Number(val);
      if (Number.isFinite(n)) { last = { date, value: n }; break; }
    }
    if (!last) return null;
    return {
      id: `fred-${s.id}-${last.date}`,
      source: 'FRED (St.Louis Fed)',
      category: '经济',
      title: `${s.cn}: ${last.value.toFixed(2)}${s.unit} (${last.date})`,
      url: `https://fred.stlouisfed.org/series/${s.id}`,
      summary: `Federal Reserve Economic Data 序列 ${s.id} · 最新观测 ${last.date}`,
      publishedAt: `${last.date}T12:00:00Z`,
      priority: s.priority,
    };
  } catch (e) {
    console.error(`[fred:${s.id}]`, (e as Error).message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchFred(): Promise<FeedItem[]> {
  const items = await Promise.all(SERIES.map(fetchOne));
  return items.filter((x): x is FeedItem => x !== null);
}
