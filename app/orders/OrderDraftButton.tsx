'use client';

import { useState } from 'react';
import { useExecutiveOrders, useGovState } from '@/lib/news/store';
import { EFFECT_LABELS, type EffectKey, type OrderEffect } from '@/lib/news/types';

const EFFECT_KEYS: EffectKey[] = ['approval', 'economy', 'diplomacy', 'security'];

export default function OrderDraftButton({
  sourceNewsId,
  sourceTitle,
}: {
  sourceNewsId?: string;
  sourceTitle?: string;
}) {
  const { create } = useExecutiveOrders();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(sourceTitle ? `针对：${sourceTitle.slice(0, 40)}` : '');
  const [body, setBody] = useState('');
  const [effects, setEffects] = useState<OrderEffect[]>([{ key: 'approval', delta: 0 }]);

  const updateEffect = (i: number, patch: Partial<OrderEffect>) => {
    setEffects((arr) => arr.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  };
  const addEffect = () => setEffects((arr) => [...arr, { key: 'economy', delta: 0 }]);
  const removeEffect = (i: number) => setEffects((arr) => arr.filter((_, idx) => idx !== i));

  const onSave = () => {
    if (!title.trim()) return;
    create({
      id: 'eo-' + Math.random().toString(36).slice(2, 10),
      ts: new Date().toISOString(),
      title: title.trim(),
      body: body.trim(),
      sourceNewsId,
      effects: effects.filter((e) => e.delta !== 0),
      status: '草案',
    });
    setOpen(false);
    setTitle('');
    setBody('');
    setEffects([{ key: 'approval', delta: 0 }]);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold text-stamp-red hover:underline"
      >
        ⚖️ 起草
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-paper max-w-lg w-full rounded border-2 border-ink p-5 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg text-ink">⚖️ 起草行政命令</h3>
            <input
              className="w-full bg-paper-dark/40 border border-ink/30 rounded px-2 py-1"
              placeholder="命令标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full bg-paper-dark/40 border border-ink/30 rounded p-2 text-sm"
              rows={4}
              placeholder="命令正文……"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-widest text-ink/60">影响</span>
                <button onClick={addEffect} className="text-xs text-stamp-red hover:underline">＋ 添加</button>
              </div>
              {effects.map((eff, i) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                  <select
                    className="bg-paper-dark/40 border border-ink/30 rounded px-2 py-1 text-sm"
                    value={eff.key}
                    onChange={(e) => updateEffect(i, { key: e.target.value as EffectKey })}
                  >
                    {EFFECT_KEYS.map((k) => (
                      <option key={k} value={k}>{EFFECT_LABELS[k]}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="bg-paper-dark/40 border border-ink/30 rounded px-2 py-1 text-sm w-20"
                    value={eff.delta}
                    onChange={(e) => updateEffect(i, { delta: Number(e.target.value) })}
                  />
                  <button onClick={() => removeEffect(i)} className="text-xs text-ink/60 hover:underline">移除</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-dashed border-ink/30">
              <button onClick={() => setOpen(false)} className="text-sm text-ink/60 hover:underline">取消</button>
              <button
                onClick={onSave}
                className="text-sm font-semibold text-white bg-stamp-red rounded px-4 py-1 hover:opacity-90"
              >
                保存为草案
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OrdersList() {
  const { orders, update, remove, hydrated } = useExecutiveOrders();
  const { apply, reverse } = useGovState();

  if (!hydrated) return <div className="briefing-card text-ink/60">加载中…</div>;
  if (orders.length === 0) {
    return <div className="briefing-card text-ink/70">尚无行政命令。从简报中点击「⚖️ 起草」开始。</div>;
  }

  const publish = (id: string) => {
    const o = orders.find((x) => x.id === id);
    if (!o || o.status !== '草案') return;
    apply(o.effects);
    update(id, { status: '已发布', ts: new Date().toISOString() });
  };
  const revoke = (id: string) => {
    const o = orders.find((x) => x.id === id);
    if (!o || o.status !== '已发布') return;
    reverse(o.effects);
    update(id, { status: '撤回' });
  };

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <article key={o.id} className="briefing-card">
          <div className="flex items-start gap-3">
            <span className="seal" aria-hidden><span style={{ fontSize: 20 }}>⚖️</span></span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-display text-lg text-ink">{o.title}</h4>
                <span className={`stamp ${o.status === '已发布' ? '' : 'opacity-60'}`}>{o.status}</span>
              </div>
              <p className="text-xs text-ink/50 font-mono mt-1">{o.ts.slice(0, 16).replace('T', ' ')}</p>
              {o.body && <p className="text-sm text-ink/80 mt-2 whitespace-pre-wrap leading-relaxed">{o.body}</p>}
              {o.effects.length > 0 && (
                <ul className="text-xs text-ink/70 mt-2 flex flex-wrap gap-2">
                  {o.effects.map((e, i) => (
                    <li key={i} className="px-2 py-0.5 bg-paper-dark/40 rounded border border-ink/20">
                      {EFFECT_LABELS[e.key]} {e.delta > 0 ? '+' : ''}{e.delta}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-3 text-xs">
                {o.status === '草案' && (
                  <button onClick={() => publish(o.id)} className="font-semibold text-stamp-red hover:underline">📜 发布</button>
                )}
                {o.status === '已发布' && (
                  <button onClick={() => revoke(o.id)} className="text-ink/70 hover:underline">↩ 撤回</button>
                )}
                <button onClick={() => remove(o.id)} className="text-ink/60 hover:underline">删除</button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
