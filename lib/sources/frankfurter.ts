import type { FeedItem } from '../aggregator';

export async function fetchFrankfurter(): Promise<FeedItem[]> {
  const url = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=CNY,EUR,JPY,GBP';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'president-sim/0.2' },
      cache: 'force-cache',
    });
    if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`);
    const json: any = await res.json();
    const date = json.date ?? new Date().toISOString().slice(0, 10);
    return Object.entries(json.rates ?? {}).map(([sym, rate]) => ({
      id: `fx-USD-${sym}-${date}`,
      source: 'Frankfurter FX',
      category: '金融',
      title: `USD/${sym} ${Number(rate).toFixed(4)}`,
      url: `https://www.frankfurter.dev/`,
      summary: `美元兑${sym}基准汇率 · 截至 ${date}`,
      publishedAt: `${date}T16:00:00Z`,
      priority: 'low',
    }));
  } catch (e) {
    console.error('[frankfurter]', (e as Error).message);
    return [];
  } finally {
    clearTimeout(t);
  }
}
