import type { FeedItem } from '../aggregator';

const COUNTRIES: Record<string, string> = { US: '美国', CN: '中国', JP: '日本', DE: '德国' };

export async function fetchWorldBank(): Promise<FeedItem[]> {
  const url =
    'https://api.worldbank.org/v2/country/US;CN;JP;DE/indicator/NY.GDP.MKTP.CD?format=json&date=2022:2023&per_page=20';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'president-sim/0.2' },
      cache: 'force-cache',
    });
    if (!res.ok) throw new Error(`worldbank HTTP ${res.status}`);
    const json: any = await res.json();
    const rows: any[] = Array.isArray(json) && json.length >= 2 ? json[1] : [];
    // 每国取最新一条非空值
    const latestByCountry = new Map<string, any>();
    for (const r of rows) {
      if (!r.value) continue;
      const k = r.countryiso3code ?? r.country?.id;
      const prev = latestByCountry.get(k);
      if (!prev || Number(r.date) > Number(prev.date)) latestByCountry.set(k, r);
    }
    return Array.from(latestByCountry.values()).map((r) => {
      const iso2 = r.country?.id ?? r.countryiso3code;
      const cn = COUNTRIES[iso2] ?? r.country?.value ?? iso2;
      const trillion = r.value / 1e12;
      return {
        id: `wb-gdp-${iso2}-${r.date}`,
        source: 'World Bank',
        category: '经济',
        title: `${cn} GDP ${r.date}: $${trillion.toFixed(2)}T`,
        url: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD',
        summary: `名义 GDP(经常美元)· 来源 World Bank Open Data`,
        publishedAt: `${r.date}-12-31T00:00:00Z`,
        priority: 'medium',
      };
    });
  } catch (e) {
    console.error('[worldbank]', (e as Error).message);
    return [];
  } finally {
    clearTimeout(t);
  }
}
