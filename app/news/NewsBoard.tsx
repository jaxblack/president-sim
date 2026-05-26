'use client';

import { useState, useMemo } from 'react';
import type { FeedItem } from '@/lib/aggregator';
import SourceManager from './SourceManager';
import NoteEditor from './NoteEditor';
import OrderDraftButton from '../orders/OrderDraftButton';
import { useNewsSources, useGovState } from '@/lib/news/store';

const SECTIONS = ['外交', '灾害', '科技', '经济'] as const;

function fmt(ts: string) { return ts.slice(0, 16).replace('T', ' '); }

export default function NewsBoard({ items }: { items: FeedItem[] }) {
  const [showSettings, setShowSettings] = useState(false);
  const { sources, hydrated } = useNewsSources();
  const { state } = useGovState();

  // 根据配置过滤 + 按权重排序（hydrated 之前显示全部，避免 SSR 闪烁）
  const filtered = useMemo(() => {
    if (!hydrated) return items;
    const enabledNames = new Set(sources.filter((s) => s.enabled).map((s) => s.name));
    const weights = new Map(sources.map((s) => [s.name, s.weight]));
    const result = items.filter((it) => {
      // 未配置的源默认显示（向后兼容）；已配置的看 enabled
      if (sources.some((s) => s.name === it.source)) return enabledNames.has(it.source);
      return true;
    });
    return result
      .map((it) => ({ it, w: weights.get(it.source) ?? 5 }))
      .sort((a, b) => b.w - a.w || (b.it.publishedAt > a.it.publishedAt ? 1 : -1))
      .map((x) => x.it);
  }, [items, sources, hydrated]);

  const byCat = new Map<string, FeedItem[]>();
  for (const it of filtered) {
    const arr = byCat.get(it.category) ?? [];
    arr.push(it);
    byCat.set(it.category, arr);
  }

  return (
    <div className="space-y-6">
      <section className="briefing-card">
        <div className="flex items-start gap-4 flex-wrap">
          <span className="seal seal-lg" aria-hidden><span style={{ fontSize: 28 }}>📰</span></span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl text-ink">情报中心 · News Desk</h2>
            <p className="text-ink/80 mt-2 leading-relaxed">
              当前聚合 <b className="text-stamp-red">{filtered.length}</b> 条情报。可在右侧调整信息源、为单条情报添加注释，或起草行政命令。
            </p>
            <p className="text-xs text-ink/55 mt-3 font-mono">
              GOV · 民意 {state.approval} · 经济 {state.economy} · 外交 {state.diplomacy} · 安全 {state.security}
            </p>
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="text-xs font-semibold text-stamp-red border border-stamp-red rounded px-3 py-1 hover:bg-stamp-red hover:text-white"
          >
            {showSettings ? '收起设置' : '⚙️ 信息源设置'}
          </button>
        </div>
      </section>

      {showSettings && <SourceManager />}

      {filtered.length === 0 && (
        <div className="briefing-card text-ink/70">⚠ 暂无情报（可能上游源不可达，或所有源已被禁用）</div>
      )}

      {SECTIONS.map((key) => {
        const list = (byCat.get(key) ?? []).slice(0, 12);
        if (list.length === 0) return null;
        return (
          <section key={key}>
            <h3 className="font-display text-xl text-ink mb-3 border-b-2 border-ink/40 pb-1">{key}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((it) => (
                <article key={it.id} className="briefing-card">
                  <div className="flex gap-2 mb-2 flex-wrap items-center">
                    <span className="source-chip">{it.source}</span>
                    <span className="ml-auto text-[11px] font-mono text-ink/60">{fmt(it.publishedAt)}</span>
                  </div>
                  <a href={it.url} target="_blank" rel="noreferrer" className="title block">{it.title}</a>
                  {it.summary && (
                    <p className="text-sm text-ink/75 mt-2 leading-relaxed line-clamp-3">{it.summary}</p>
                  )}
                  <NoteEditor newsId={it.id} title={it.title} />
                  <div className="mt-3 pt-3 border-t border-dashed border-ink/20 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-ink/40">{it.category} · brief</span>
                    <OrderDraftButton sourceNewsId={it.id} sourceTitle={it.title} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
