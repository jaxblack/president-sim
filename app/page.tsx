import { fetchAllFeeds } from '@/lib/aggregator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const items = await fetchAllFeeds().catch((e) => {
    console.error('[home]', e);
    return [];
  });
  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="text-lg font-semibold text-accent">总统先生/女士,早上好</h2>
        <p className="text-slate-300 mt-1">
          今日聚合 <b>{items.length}</b> 条来自世界各地的关键情报。下方按发布时间倒序展示,点击标题查阅原文。
        </p>
        <p className="text-xs text-slate-500 mt-2">
          信息源:BBC World · Reuters World · USGS 地震 · Hacker News 头条
        </p>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.slice(0, 30).map((it) => (
          <article key={it.id} className="card">
            <div className="flex gap-2 mb-2 flex-wrap items-center">
              <span className="badge bg-slate-700 text-slate-200">{it.source}</span>
              <span className="badge bg-slate-800 text-accent">{it.category}</span>
              <span className="text-xs text-slate-500 ml-auto">
                {it.publishedAt.slice(0, 16).replace('T', ' ')}
              </span>
            </div>
            <a
              href={it.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold hover:text-accent block"
            >
              {it.title}
            </a>
            {it.summary && (
              <p className="text-sm text-slate-400 mt-2 line-clamp-3">{it.summary}</p>
            )}
          </article>
        ))}
        {items.length === 0 && (
          <div className="card md:col-span-2 text-slate-400">
            ⚠ 暂无情报(上游源可能不可达,刷新试试)
          </div>
        )}
      </div>
    </div>
  );
}
