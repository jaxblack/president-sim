import type { FeedItem } from '../aggregator';

export async function fetchGhTrending(): Promise<FeedItem[]> {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const url = `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=8`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'president-sim/0.2',
      Accept: 'application/vnd.github+json',
    };
    if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
    const res = await fetch(url, { signal: ctrl.signal, headers, cache: 'no-store' });
    if (!res.ok) throw new Error(`gh-trending HTTP ${res.status}`);
    const json: any = await res.json();
    return (json.items ?? []).slice(0, 8).map((r: any) => ({
      id: `gh-${r.id}`,
      source: 'GitHub Trending (7d)',
      category: '科技',
      title: `${r.full_name} ⭐${r.stargazers_count.toLocaleString()}`,
      url: r.html_url,
      summary: (r.description ?? '').slice(0, 280),
      publishedAt: r.created_at,
      priority: r.stargazers_count > 500 ? 'high' : 'medium',
    }));
  } catch (e) {
    console.error('[gh-trending]', (e as Error).message);
    return [];
  } finally {
    clearTimeout(t);
  }
}
