import { fetchAllFeeds, type FeedItem } from '@/lib/aggregator';
import NewsBoard from './NewsBoard';

export const dynamic = 'force-static';
export const revalidate = false;

export default async function NewsPage() {
  const items: FeedItem[] = await fetchAllFeeds().catch(() => [] as FeedItem[]);
  return <NewsBoard items={items} />;
}
