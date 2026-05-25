import Parser from 'rss-parser';
import type { FeedItem } from '../aggregator';

const parser = new Parser({ timeout: 8000, headers: { 'User-Agent': 'president-sim/0.2' } });

export async function fetchArxiv(): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(
      'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=8'
    );
    return (feed.items ?? []).slice(0, 8).map((it: any, i: number) => ({
      id: `arxiv-${String(it.id ?? it.link ?? i).slice(-50)}`,
      source: 'arXiv cs.AI',
      category: '科技',
      title: (it.title ?? '(无标题)').replace(/\s+/g, ' ').trim().slice(0, 200),
      url: it.link ?? '#',
      summary: (it.contentSnippet ?? it.summary ?? '').replace(/\s+/g, ' ').slice(0, 280),
      publishedAt: it.isoDate ?? it.pubDate ?? new Date().toISOString(),
      priority: 'medium',
    }));
  } catch (e) {
    console.error('[arxiv]', (e as Error).message);
    return [];
  }
}
