'use client';

import { useGovState } from '@/lib/news/store';
import { EFFECT_LABELS, type EffectKey } from '@/lib/news/types';

const KEYS: EffectKey[] = ['approval', 'economy', 'diplomacy', 'security'];

export default function GovDashboard() {
  const { state, hydrated, reset } = useGovState();
  if (!hydrated) return null;
  return (
    <section className="briefing-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-ink">📊 政府状态</h3>
        <button onClick={reset} className="text-xs text-stamp-red hover:underline">重置</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KEYS.map((k) => {
          const v = state[k];
          return (
            <div key={k} className="bg-paper-dark/40 border border-ink/20 rounded p-3">
              <div className="text-[10px] uppercase tracking-widest text-ink/60">{EFFECT_LABELS[k]}</div>
              <div className="font-mono text-2xl text-ink mt-1">{v}</div>
              <div className="mt-1 h-1.5 bg-ink/10 rounded overflow-hidden">
                <div
                  className="h-full bg-stamp-red"
                  style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
