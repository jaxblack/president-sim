'use client';

import { useEffect, useState } from 'react';
import {
  loadScores,
  loadHistory,
  applyScoreDelta,
  resetScores,
  dailyTrend,
  SCORE_KEYS,
  type Scores,
  type ScoreEvent,
  type ScoreKey,
} from '@/lib/scores';

const RADAR_KEYS: ScoreKey[] = ['民意', '经济', '国际形象', '国家安全', '总分'];

function Radar({ scores }: { scores: Scores }) {
  const size = 280;
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 30;
  const n = RADAR_KEYS.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, r: number) => `${cx + r * Math.cos(angle(i))},${cy + r * Math.sin(angle(i))}`;

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPts = RADAR_KEYS.map((k, i) => pt(i, (scores[k] / 100) * R)).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[320px] mx-auto">
      {rings.map((r, i) => (
        <polygon
          key={i}
          points={RADAR_KEYS.map((_, j) => pt(j, R * r)).join(' ')}
          fill="none" stroke="#1c2331" strokeOpacity={0.15} strokeWidth={1}
        />
      ))}
      {RADAR_KEYS.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + R * Math.cos(angle(i))} y2={cy + R * Math.sin(angle(i))} stroke="#1c2331" strokeOpacity={0.15} />
      ))}
      <polygon points={dataPts} fill="#c0392b" fillOpacity={0.25} stroke="#c0392b" strokeWidth={2} />
      {RADAR_KEYS.map((k, i) => {
        const p = pt(i, R + 14).split(',');
        return (
          <text key={k} x={p[0]} y={p[1]} textAnchor="middle" fontSize={11} fill="#1c2331" fontWeight={600}>
            {k} {scores[k]}
          </text>
        );
      })}
    </svg>
  );
}

function TrendChart({ series, label }: { series: number[]; label: string }) {
  const W = 320, H = 60;
  const max = 100, min = 0;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - ((v - min) / (max - min)) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = series[series.length - 1];
  const first = series[0];
  const delta = last - first;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink/70">{label}</span>
        <span className={delta >= 0 ? 'text-oval-green' : 'text-stamp-red'}>
          {last} ({delta >= 0 ? '+' : ''}{delta})
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12 bg-paper-dark/30 rounded">
        <polyline points={pts} fill="none" stroke="#c0392b" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

export default function ScoresPage() {
  const [scores, setScores] = useState<Scores | null>(null);
  const [history, setHistory] = useState<ScoreEvent[]>([]);
  const [reason, setReason] = useState('手动调整');

  useEffect(() => {
    setScores(loadScores());
    setHistory(loadHistory());
  }, []);

  const refresh = () => {
    setScores(loadScores());
    setHistory(loadHistory());
  };

  const adjust = (k: ScoreKey, d: number) => {
    applyScoreDelta({ key: k, delta: d, reason, ts: Date.now() });
    refresh();
  };

  if (!scores) return <div className="text-ink/60">加载评分…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl text-ink">📊 国民评分 · National Scores</h2>
        <button
          onClick={() => { if (confirm('重置全部评分?')) { resetScores(); refresh(); } }}
          className="px-3 py-1 text-sm border border-ink/30 rounded hover:bg-paper-dark"
        >重置</button>
      </div>

      <div className="grid lg:grid-cols-[1fr,1fr] gap-6">
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-2">五维雷达</div>
          <Radar scores={scores} />
        </div>

        <div className="briefing-card space-y-4">
          <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-1">即时调整</div>
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-ink/60 mb-1">原因</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-ink/30 rounded px-2 py-1 bg-paper text-sm"
            />
          </div>
          {SCORE_KEYS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <span className="font-display text-sm text-ink w-20">{k}</span>
              <div className="flex-1 h-2 bg-paper-dark rounded overflow-hidden">
                <div className="h-full bg-stamp-red" style={{ width: `${scores[k]}%` }} />
              </div>
              <span className="font-mono text-sm text-ink w-8 text-right">{scores[k]}</span>
              <div className="flex gap-1">
                <button onClick={() => adjust(k, -5)} className="px-2 py-0.5 text-xs border border-ink/30 rounded hover:bg-paper-dark">-5</button>
                <button onClick={() => adjust(k, -1)} className="px-2 py-0.5 text-xs border border-ink/30 rounded hover:bg-paper-dark">-1</button>
                <button onClick={() => adjust(k, 1)} className="px-2 py-0.5 text-xs border border-ink/30 rounded hover:bg-paper-dark">+1</button>
                <button onClick={() => adjust(k, 5)} className="px-2 py-0.5 text-xs border border-ink/30 rounded hover:bg-paper-dark">+5</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="briefing-card">
        <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3">30 日趋势</div>
        <div className="grid md:grid-cols-2 gap-4">
          {SCORE_KEYS.map((k) => (
            <TrendChart key={k} series={dailyTrend(history, k, 30)} label={k} />
          ))}
        </div>
      </div>

      <div className="briefing-card">
        <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3">事件流(最近 {Math.min(history.length, 30)})</div>
        {history.length === 0 ? (
          <div className="text-sm text-ink/60">暂无事件</div>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto text-xs">
            {[...history].slice(-30).reverse().map((ev, i) => (
              <div key={i} className="flex items-center justify-between border-b border-ink/10 py-1">
                <span className="text-ink/70">{new Date(ev.ts).toLocaleString('zh-CN')}</span>
                <span className="font-display">{ev.key}</span>
                <span className={ev.delta >= 0 ? 'text-oval-green font-mono' : 'text-stamp-red font-mono'}>
                  {ev.delta >= 0 ? '+' : ''}{ev.delta}
                </span>
                <span className="text-ink/60 truncate ml-2 max-w-[40%]">{ev.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
