import Parser from 'rss-parser';
import { fetchArxiv } from './sources/arxiv';
import { fetchGhTrending } from './sources/gh-trending';
import { fetchCoingecko } from './sources/coingecko';
import { fetchFrankfurter } from './sources/frankfurter';
import { fetchWorldBank } from './sources/worldbank';
import { fetchFred } from './sources/fred';

export type Priority = 'high' | 'medium' | 'low';

export type FeedItem = {
  id: string;
  source: string;
  category: string;
  title: string;
  url: string;
  summary?: string;
  publishedAt: string;
  priority?: Priority;
};

const SOURCES = [
  { id: 'bbc-world',     name: 'BBC World',      category: '外交', protocol: 'rss',  url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'reuters-world', name: 'Reuters World',  category: '外交', protocol: 'rss',  url: 'https://feeds.reuters.com/Reuters/worldNews' },
  { id: 'usgs-quake',    name: 'USGS 地震',      category: '灾害', protocol: 'usgs', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson' },
  { id: 'hn-front',      name: 'Hacker News',    category: '科技', protocol: 'hn',   url: 'https://hacker-news.firebaseio.com/v0/topstories.json' },
];

const parser = new Parser({ timeout: 8000, headers: { 'User-Agent': 'president-sim/0.1' } });

async function fetchRss(s: any): Promise<FeedItem[]> {
  const feed = await parser.parseURL(s.url);
  return (feed.items ?? []).slice(0, 10).map((it: any, i: number) => ({
    id: `${s.id}-${String(it.guid ?? it.link ?? i).slice(-50)}`,
    source: s.name,
    category: s.category,
    title: (it.title ?? '(无标题)').trim(),
    url: it.link ?? '#',
    summary: (it.contentSnippet ?? '').replace(/\s+/g, ' ').slice(0, 280),
    publishedAt: it.isoDate ?? it.pubDate ?? new Date().toISOString(),
  }));
}

async function fetchUsgs(s: any): Promise<FeedItem[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(s.url, {
      signal: ctrl.signal,
      cache: 'force-cache',
      headers: { 'User-Agent': 'president-sim/0.1' },
    });
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
    const json: any = await res.json();
    return (json.features ?? []).slice(0, 10).map((f: any) => ({
      id: `${s.id}-${f.id}`,
      source: s.name,
      category: s.category,
      title: `M${(f.properties.mag ?? 0).toFixed(1)} ${f.properties.place ?? ''}`,
      url: f.properties.url,
      summary: `震级 ${(f.properties.mag ?? 0).toFixed(1)},地点:${f.properties.place ?? '?'}。`,
      publishedAt: new Date(f.properties.time).toISOString(),
    }));
  } finally {
    clearTimeout(t);
  }
}

async function fetchHn(s: any): Promise<FeedItem[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const idsRes = await fetch(s.url, { signal: ctrl.signal, cache: 'force-cache' });
    if (!idsRes.ok) throw new Error(`HN HTTP ${idsRes.status}`);
    const ids: number[] = await idsRes.json();
    const items = await Promise.all(
      ids.slice(0, 10).map(async (id) => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: ctrl.signal,
          cache: 'force-cache',
        });
        return r.ok ? r.json() : null;
      })
    );
    return items.filter(Boolean).map((it: any) => ({
      id: `${s.id}-${it.id}`,
      source: s.name,
      category: s.category,
      title: it.title ?? '(无标题)',
      url: it.url ?? `https://news.ycombinator.com/item?id=${it.id}`,
      summary: `${it.score ?? 0} 分 · ${it.descendants ?? 0} 条讨论`,
      publishedAt: new Date((it.time ?? 0) * 1000).toISOString(),
    }));
  } finally {
    clearTimeout(t);
  }
}

function inferPriority(it: FeedItem): Priority {
  if (it.priority) return it.priority;
  // USGS 显著地震 — 任意 M>=6 视为 high
  const m = it.title.match(/^M(\d+(?:\.\d+)?)/);
  if (m && Number(m[1]) >= 6) return 'high';
  if (it.category === '灾害') return 'medium';
  return 'low';
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const legacy = await Promise.all(
    SOURCES.map(async (s) => {
      try {
        if (s.protocol === 'rss') return await fetchRss(s);
        if (s.protocol === 'usgs') return await fetchUsgs(s);
        if (s.protocol === 'hn') return await fetchHn(s);
        return [];
      } catch (e) {
        console.error(`[aggregator] ${s.id}:`, (e as Error).message);
        return [];
      }
    })
  );
  const extra = await Promise.all([
    fetchArxiv(),
    fetchGhTrending(),
    fetchCoingecko(),
    fetchFrankfurter(),
    fetchWorldBank(),
    fetchFred(),
  ]);
  const all = [...legacy.flat(), ...extra.flat()].map((it) => ({
    ...it,
    priority: inferPriority(it),
  }));
  return all.sort((a, b) => (b.publishedAt > a.publishedAt ? 1 : -1)).slice(0, 60);
}
