'use client';

import { useState } from 'react';
import { useNewsSources } from '@/lib/news/store';
import type { NewsSource } from '@/lib/news/types';

function genId(name: string) {
  return (
    'src-' +
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24) +
    '-' +
    Math.random().toString(36).slice(2, 6)
  );
}

export default function SourceManager() {
  const { sources, hydrated, toggle, setWeight, add, remove, update, reset } = useNewsSources();
  const [draft, setDraft] = useState<Partial<NewsSource>>({ name: '', category: '外交', url: '', enabled: true, weight: 5 });

  if (!hydrated) return <div className="briefing-card text-ink/60">加载中…</div>;

  const onAdd = () => {
    if (!draft.name) return;
    add({
      id: genId(draft.name),
      name: draft.name,
      category: (draft.category as string) || '其他',
      url: draft.url || undefined,
      enabled: !!draft.enabled,
      weight: Number(draft.weight ?? 5),
    });
    setDraft({ name: '', category: '外交', url: '', enabled: true, weight: 5 });
  };

  return (
    <section className="briefing-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-ink">📡 信息源管理</h3>
        <button onClick={reset} className="text-xs text-stamp-red hover:underline">恢复默认</button>
      </div>

      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-widest text-ink/60">
          <tr>
            <th className="text-left py-1">启用</th>
            <th className="text-left py-1">名称</th>
            <th className="text-left py-1">分类</th>
            <th className="text-left py-1">权重</th>
            <th className="text-left py-1">URL</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id} className="border-t border-dashed border-ink/15">
              <td className="py-1">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={() => toggle(s.id)}
                  aria-label={`enable ${s.name}`}
                />
              </td>
              <td className="py-1">
                <input
                  className="bg-transparent border-b border-ink/20 px-1 w-32"
                  value={s.name}
                  onChange={(e) => update(s.id, { name: e.target.value })}
                />
              </td>
              <td className="py-1">
                <select
                  className="bg-transparent border-b border-ink/20 px-1"
                  value={s.category}
                  onChange={(e) => update(s.id, { category: e.target.value })}
                >
                  {['外交', '灾害', '科技', '经济', '其他'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </td>
              <td className="py-1">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={s.weight}
                    onChange={(e) => setWeight(s.id, Number(e.target.value))}
                  />
                  <span className="font-mono text-xs w-6 text-right">{s.weight}</span>
                </div>
              </td>
              <td className="py-1">
                <input
                  className="bg-transparent border-b border-ink/20 px-1 w-56 text-xs font-mono"
                  value={s.url ?? ''}
                  onChange={(e) => update(s.id, { url: e.target.value })}
                />
              </td>
              <td className="py-1">
                <button
                  className="text-xs text-stamp-red hover:underline"
                  onClick={() => remove(s.id)}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-3 border-t border-dashed border-ink/30">
        <h4 className="text-xs uppercase tracking-widest text-ink/60 mb-2">➕ 新增源</h4>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            placeholder="名称"
            className="bg-paper-dark/40 border border-ink/30 rounded px-2 py-1 text-sm"
            value={draft.name ?? ''}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <select
            className="bg-paper-dark/40 border border-ink/30 rounded px-2 py-1 text-sm"
            value={draft.category as string}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            {['外交', '灾害', '科技', '经济', '其他'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            placeholder="URL (可选)"
            className="bg-paper-dark/40 border border-ink/30 rounded px-2 py-1 text-sm flex-1 min-w-[200px] font-mono text-xs"
            value={draft.url ?? ''}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
          <input
            type="number"
            min={0}
            max={10}
            className="bg-paper-dark/40 border border-ink/30 rounded px-2 py-1 text-sm w-16"
            value={draft.weight ?? 5}
            onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })}
          />
          <button
            className="text-xs font-semibold text-stamp-red border border-stamp-red rounded px-3 py-1 hover:bg-stamp-red hover:text-white"
            onClick={onAdd}
          >
            添加
          </button>
        </div>
      </div>
    </section>
  );
}
