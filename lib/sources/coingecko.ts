import type { FeedItem } from '../aggregator';

export async function fetchCoingecko(): Promise<FeedItem[]> {
  const url =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&price_change_percentage=24h';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'president-sim/0.2', Accept: 'application/json' },
      cache: 'force-cache',
    });
    if (!res.ok) throw new Error(`coingecko HTTP ${res.status}`);
    const json: any = await res.json();
    return (json ?? []).slice(0, 8).map((c: any) => {
      const pct = c.price_change_percentage_24h ?? 0;
      const arrow = pct >= 0 ? '▲' : '▼';
      return {
        id: `cg-${c.id}`,
        source: 'CoinGecko',
        category: '金融',
        title: `${c.symbol?.toUpperCase()} $${Number(c.current_price).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${arrow}${pct.toFixed(2)}%`,
        url: `https://www.coingecko.com/en/coins/${c.id}`,
        summary: `${c.name} · 市值 $${(c.market_cap / 1e9).toFixed(1)}B · 24h 成交 $${(c.total_volume / 1e9).toFixed(1)}B`,
        publishedAt: c.last_updated ?? new Date().toISOString(),
        priority: Math.abs(pct) > 5 ? 'high' : 'medium',
      };
    });
  } catch (e) {
    console.error('[coingecko]', (e as Error).message);
    return [];
  } finally {
    clearTimeout(t);
  }
}
