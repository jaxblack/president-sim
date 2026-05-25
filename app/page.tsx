import { fetchAllFeeds, type FeedItem } from '@/lib/aggregator';
import BriefingCard from './components/BriefingCard';
import SectionHeader from './components/SectionHeader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECTIONS: { key: string; title: string; subtitle: string; icon: string }[] = [
  { key: '外交', title: '外交 · Foreign Affairs', subtitle: 'diplomatic wire', icon: '🌐' },
  { key: '灾害', title: '灾害 · Disasters', subtitle: 'emergency desk', icon: '🌋' },
  { key: '科技', title: '科技 · Technology', subtitle: 'innovation watch', icon: '🛰️' },
  { key: '经济', title: '经济 · Economy', subtitle: 'treasury & markets', icon: '💰' },
];

export default async function Home() {
  const items: FeedItem[] = await fetchAllFeeds().catch((e) => {
    console.error('[home]', e);
    return [] as FeedItem[];
  });

  const byCategory = new Map<string, FeedItem[]>();
  for (const it of items) {
    const arr = byCategory.get(it.category) ?? [];
    arr.push(it);
    byCategory.set(it.category, arr);
  }

  return (
    <div className="space-y-6">
      {/* Opening briefing */}
      <section className="briefing-card">
        <div className="flex items-start gap-4">
          <span className="seal seal-lg" aria-hidden>
            <span style={{ fontSize: 28 }}>📜</span>
          </span>
          <div className="flex-1">
            <h2 className="font-display text-2xl text-ink">
              总统先生 / 女士,早上好
            </h2>
            <p className="text-ink/80 mt-2 leading-relaxed">
              今日聚合 <b className="text-stamp-red">{items.length}</b> 条来自世界各地的关键情报。
              下方按类别分区展示,按发布时间倒序。点击标题查阅原文。
            </p>
            <p className="text-xs text-ink/55 mt-3 font-mono">
              SOURCES · BBC World · Reuters World · USGS Quakes · Hacker News
            </p>
          </div>
          <span className="stamp">TOP&nbsp;SECRET</span>
        </div>
      </section>

      {items.length === 0 && (
        <div className="briefing-card text-ink/70">
          ⚠ 暂无情报(上游源可能不可达,刷新试试)
        </div>
      )}

      {SECTIONS.map(({ key, title, subtitle, icon }) => {
        const sectionItems = (byCategory.get(key) ?? []).slice(0, 12);
        if (sectionItems.length === 0) return null;
        return (
          <section key={key}>
            <SectionHeader
              title={title}
              subtitle={subtitle}
              icon={icon}
              count={sectionItems.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectionItems.map((it) => (
                <BriefingCard key={it.id} item={it} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Anything not falling into known sections */}
      {(() => {
        const known = new Set(SECTIONS.map((s) => s.key));
        const other = items.filter((it) => !known.has(it.category)).slice(0, 12);
        if (other.length === 0) return null;
        return (
          <section>
            <SectionHeader
              title="其他 · Misc"
              subtitle="general intake"
              icon="📌"
              count={other.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {other.map((it) => (
                <BriefingCard key={it.id} item={it} />
              ))}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
