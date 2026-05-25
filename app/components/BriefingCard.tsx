'use client';

import PriorityBadge, { Priority } from './PriorityBadge';

export type BriefingItem = {
  id: string;
  source: string;
  category: string;
  title: string;
  url: string;
  summary?: string;
  publishedAt: string;
};

function inferPriority(it: BriefingItem): Priority {
  const t = (it.title || '').toLowerCase();
  if (it.category === '灾害') {
    const m = t.match(/m\s*(\d+(\.\d+)?)/);
    if (m && parseFloat(m[1]) >= 6.0) return 'high';
    return 'med';
  }
  if (/war|strike|attack|missile|nuclear|战争|袭击|核|导弹|killed|crisis/.test(t)) return 'high';
  if (/election|summit|deal|talks|sanction|协议|峰会|制裁/.test(t)) return 'med';
  return 'low';
}

function fmt(ts: string) {
  return ts.slice(0, 16).replace('T', ' ');
}

export default function BriefingCard({ item }: { item: BriefingItem }) {
  const priority = inferPriority(item);
  return (
    <article className="briefing-card">
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="source-chip">{item.source}</span>
        <PriorityBadge level={priority} />
        <span className="ml-auto text-[11px] font-mono text-ink/60">
          {fmt(item.publishedAt)}
        </span>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="title block"
      >
        {item.title}
      </a>
      {item.summary && (
        <p className="text-sm text-ink/75 mt-2 leading-relaxed line-clamp-3">
          {item.summary}
        </p>
      )}
      <div className="mt-3 pt-3 border-t border-dashed border-ink/20 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-ink/40">
          {item.category} · brief
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-semibold text-stamp-red hover:underline"
        >
          阅读原文 →
        </a>
      </div>
    </article>
  );
}
