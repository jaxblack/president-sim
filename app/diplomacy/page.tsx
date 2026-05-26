'use client';

import { useEffect, useState } from 'react';
import {
  loadDiplomacy,
  applyAction,
  globalIndex,
  type Nation,
  type DiplomacyAction,
} from '@/lib/diplomacy';

const ACTIONS: DiplomacyAction[] = ['会谈', '制裁', '援助', '贸易'];

function attitudeColor(a: number): string {
  if (a >= 60) return '#2c5f4f';
  if (a >= 20) return '#7fb069';
  if (a >= -20) return '#c9a961';
  if (a >= -60) return '#e67e22';
  return '#c0392b';
}

function attitudeLabel(a: number): string {
  if (a >= 60) return '盟友';
  if (a >= 20) return '友好';
  if (a >= -20) return '中立';
  if (a >= -60) return '紧张';
  return '敌对';
}

function Sparkline({ data }: { data: number[] }) {
  const W = 80, H = 24;
  const series = data.slice(-7);
  const min = -100, max = 100;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - ((v - min) / (max - min)) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = series[series.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <polyline points={pts} fill="none" stroke={attitudeColor(last)} strokeWidth={1.5} />
    </svg>
  );
}

function AttitudeBar({ value }: { value: number }) {
  // -100..100 → 0..100% with 50% mid
  const pct = (value + 100) / 2;
  return (
    <div className="relative h-2 bg-paper-dark rounded overflow-hidden">
      <div className="absolute inset-y-0 left-1/2 w-px bg-ink/40" />
      {value >= 0 ? (
        <div className="absolute top-0 bottom-0 left-1/2" style={{ width: `${pct - 50}%`, background: attitudeColor(value) }} />
      ) : (
        <div className="absolute top-0 bottom-0" style={{ left: `${pct}%`, width: `${50 - pct}%`, background: attitudeColor(value) }} />
      )}
    </div>
  );
}

export default function DiplomacyPage() {
  const [nations, setNations] = useState<Nation[]>([]);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setNations(loadDiplomacy());
    setReady(true);
  }, []);

  const act = (code: string, action: DiplomacyAction) => {
    const next = applyAction(nations, code, action);
    setNations(next);
    const n = next.find((x) => x.code === code);
    if (n) {
      setFlash(`${n.flag} ${n.name}: ${n.lastEvent}`);
      setTimeout(() => setFlash(null), 2000);
    }
  };

  if (!ready) return <div className="text-ink/60">加载外交数据…</div>;

  const idx = globalIndex(nations);
  const sorted = [...nations].sort((a, b) => b.attitude - a.attitude);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink">🌐 外交 · Diplomacy</h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">全球平均</div>
          <div className="font-display text-2xl text-ink mt-1" style={{ color: attitudeColor(idx.avg) }}>{idx.avg >= 0 ? '+' : ''}{idx.avg}</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">盟友 (≥60)</div>
          <div className="font-display text-2xl text-oval-green mt-1">{idx.allies}</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">敌对 (≤-60)</div>
          <div className="font-display text-2xl text-stamp-red mt-1">{idx.hostile}</div>
        </div>
      </div>

      {flash && (
        <div className="briefing-card text-sm text-ink bg-paper-dark/50 border-stamp-red">{flash}</div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {sorted.map((n) => (
          <div key={n.code} className="briefing-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{n.flag}</span>
                <div>
                  <div className="font-display text-base text-ink leading-tight">{n.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-ink/50">{n.code} · {attitudeLabel(n.attitude)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg" style={{ color: attitudeColor(n.attitude) }}>
                  {n.attitude >= 0 ? '+' : ''}{n.attitude}
                </div>
                <Sparkline data={n.trend} />
              </div>
            </div>
            <AttitudeBar value={n.attitude} />
            {n.lastEvent && (
              <div className="text-[10px] text-ink/55 mt-2">最近:{n.lastEvent} · {new Date(n.ts).toLocaleString('zh-CN')}</div>
            )}
            <div className="flex gap-1 mt-2">
              {ACTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => act(n.code, a)}
                  className="flex-1 px-2 py-1 text-xs border border-ink/30 rounded hover:bg-paper-dark transition-colors"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
