'use client';

import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import {
  FED_LS_KEY,
  defaultFedState,
  inferStance,
  estimateEffects,
  nextFomcDaysFromNow,
  type FedState,
  type FedStatement,
  type QeMode,
  type Stance,
} from '@/lib/fed';

function loadFed(): FedState {
  if (typeof window === 'undefined') return defaultFedState();
  try {
    const raw = localStorage.getItem(FED_LS_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as FedState;
      if (obj && typeof obj.policyRate === 'number' && Array.isArray(obj.history)) return obj;
    }
  } catch {}
  return defaultFedState();
}

function saveFed(s: FedState) {
  try { localStorage.setItem(FED_LS_KEY, JSON.stringify(s)); } catch {}
}

function emitRateChange(detail: { policyRate: number; prev: number; ts: number }) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('pf:fed-rate-change', { detail }));
  } catch {}
}

function PolicyRateChart({ history }: { history: FedState['history'] }) {
  const last30 = history.slice(-30);
  if (last30.length < 2) return <div className="text-ink/50 text-sm">历史不足</div>;
  const W = 480, H = 140, P = 28;
  const ys = last30.map((p) => p.policyRate);
  const yMin = Math.min(...ys) - 0.25, yMax = Math.max(...ys) + 0.25;
  const sx = (i: number) => P + (i / (last30.length - 1)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - yMin) / (yMax - yMin || 1)) * (H - 2 * P);
  const path = last30.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(p.policyRate).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} fill="none" stroke="#e8e0cc" />
      <path d={path} fill="none" stroke="#2c5f4f" strokeWidth={2} />
      <text x={P} y={16} fontSize="11" fontFamily="'Bree Serif',serif" fill="#1c2331">
        Policy Rate · last {last30.length} days
      </text>
      <text x={W - P} y={16} textAnchor="end" fontSize="11" fontFamily="monospace" fill="#c0392b">
        {last30[last30.length - 1].policyRate.toFixed(2)}%
      </text>
    </svg>
  );
}

function StanceBadge({ stance }: { stance: Stance }) {
  const map: Record<Stance, { label: string; cls: string }> = {
    hawkish: { label: '鹰派 HAWK',   cls: 'bg-stamp-red text-paper' },
    neutral: { label: '中性 NEUTRAL',cls: 'bg-ink/70 text-paper' },
    dovish:  { label: '鸽派 DOVE',   cls: 'bg-oval-green text-paper' },
  };
  const v = map[stance];
  return <span className={`text-[10px] px-2 py-0.5 rounded font-display ${v.cls}`}>{v.label}</span>;
}

export default function FedPage() {
  const [state, setState] = useState<FedState>(defaultFedState());
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState('');
  const fomc = useMemo(() => nextFomcDaysFromNow(), []);

  useEffect(() => { setState(loadFed()); setMounted(true); }, []);

  function commit(next: FedState) {
    setState(next);
    saveFed(next);
  }

  function setRate(v: number) {
    const prev = state.policyRate;
    const ts = Date.now();
    const next: FedState = {
      ...state,
      policyRate: v,
      ts,
      history: [...state.history, { ts, policyRate: v, qeMode: state.qeMode, qeMonthlyB: state.qeMonthlyB }].slice(-365),
    };
    commit(next);
    emitRateChange({ policyRate: v, prev, ts });
  }

  function setQeMode(m: QeMode) {
    commit({ ...state, qeMode: m, ts: Date.now() });
  }

  function setQeAmt(v: number) {
    commit({ ...state, qeMonthlyB: v, ts: Date.now() });
  }

  function publish() {
    const text = draft.trim();
    if (!text) return;
    const stance = inferStance(text);
    const effects = estimateEffects(stance);
    const stmt: FedStatement = { ts: Date.now(), text, stance, effects };
    commit({ ...state, statements: [stmt, ...state.statements].slice(0, 50) });
    setDraft('');
    try {
      window.dispatchEvent(new CustomEvent('pf:fed-statement', { detail: stmt }));
    } catch {}
  }

  // SSR / 首屏避免不一致
  if (!mounted) {
    return (
      <div className="space-y-6">
        <SectionHeader title="美联储 · Federal Reserve" subtitle="monetary policy console" icon="🏛️" />
        <div className="briefing-card text-ink/50">加载本地状态…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="美联储 · Federal Reserve" subtitle="monetary policy console" icon="🏛️" />

      {/* 顶部 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">联邦基金目标利率</div>
          <div className="font-display text-2xl text-stamp-red mt-1">{state.policyRate.toFixed(2)}%</div>
          <div className="text-[11px] text-ink/50 mt-1">policy rate</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">QE / QT</div>
          <div className="font-display text-2xl text-ink mt-1">{state.qeMode.toUpperCase()}</div>
          <div className="text-[11px] text-ink/50 mt-1">${state.qeMonthlyB}B / 月</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">下次 FOMC</div>
          <div className="font-display text-2xl text-ink mt-1">{fomc.daysAway} 天</div>
          <div className="text-[11px] text-ink/50 mt-1">{fomc.date}</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">已发布声明</div>
          <div className="font-display text-2xl text-ink mt-1">{state.statements.length}</div>
          <div className="text-[11px] text-ink/50 mt-1">statements</div>
        </div>
      </div>

      {/* 操控面板 */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3">联邦基金利率(滑杆)</div>
          <input
            type="range"
            min={0} max={10} step={0.25}
            value={state.policyRate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-stamp-red"
          />
          <div className="flex justify-between text-[10px] text-ink/50 font-mono mt-1">
            <span>0.00%</span><span>5.00%</span><span>10.00%</span>
          </div>
          <div className="mt-2 text-sm text-ink/70">
            当前 <b className="font-mono text-stamp-red">{state.policyRate.toFixed(2)}%</b>
            <span className="ml-2 text-[11px] text-ink/50">变化会派发 <code>pf:fed-rate-change</code> 事件</span>
          </div>
        </div>

        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3">QE / QT 操作</div>
          <div className="flex gap-2 mb-3">
            {(['qe', 'off', 'qt'] as QeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setQeMode(m)}
                className={`px-3 py-1.5 rounded text-sm font-display border ${state.qeMode === m ? 'bg-ink text-paper border-ink' : 'border-ink/30 text-ink hover:bg-paper-dark'}`}
              >
                {m === 'qe' ? 'QE 扩表' : m === 'qt' ? 'QT 缩表' : '维持'}
              </button>
            ))}
          </div>
          <label className="text-[11px] uppercase tracking-widest text-ink/60">月度规模 ($B / 月)</label>
          <input
            type="range" min={0} max={200} step={5}
            value={state.qeMonthlyB}
            onChange={(e) => setQeAmt(Number(e.target.value))}
            className="w-full accent-oval-green"
            disabled={state.qeMode === 'off'}
          />
          <div className="text-sm text-ink/70 mt-1">
            <b className="font-mono">${state.qeMonthlyB}B</b> / 月
            {state.qeMode === 'off' && <span className="text-ink/40"> · 当前未启用</span>}
          </div>
        </div>
      </div>

      {/* 声明草拟 */}
      <div className="briefing-card">
        <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3">鹰派 / 鸽派 声明草拟</div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="例:委员会注意到通胀仍高于 2% 目标,将必要时进一步加息以抑制需求…"
          rows={4}
          className="w-full text-sm p-2 border border-ink/30 rounded bg-paper-dark/40 font-mono"
        />
        <div className="flex items-center gap-2 mt-2">
          <div className="text-[11px] text-ink/60">关键词推断:</div>
          <StanceBadge stance={inferStance(draft || ' ')} />
          {(() => {
            const e = estimateEffects(inferStance(draft || ' '));
            return (
              <div className="text-[11px] text-ink/55 font-mono">
                估计影响:股市 {e.stocksPct > 0 ? '+' : ''}{e.stocksPct}% · 美元 {e.dollarIdxPct > 0 ? '+' : ''}{e.dollarIdxPct}% · 民意 {e.approvalPct > 0 ? '+' : ''}{e.approvalPct}%
              </div>
            );
          })()}
          <button
            onClick={publish}
            disabled={!draft.trim()}
            className="ml-auto px-3 py-1.5 rounded text-sm font-display bg-stamp-red text-paper disabled:opacity-40"
          >发布声明</button>
        </div>
      </div>

      {/* 历史曲线 */}
      <div className="briefing-card">
        <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3">政策利率历史 · 最近 30 天</div>
        <PolicyRateChart history={state.history} />
      </div>

      {/* 已发布声明 */}
      {state.statements.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3 px-1">已发布声明</div>
          <div className="space-y-3">
            {state.statements.slice(0, 8).map((s) => (
              <div key={s.ts} className="briefing-card">
                <div className="flex items-center gap-2 mb-1">
                  <StanceBadge stance={s.stance} />
                  <span className="text-[11px] text-ink/50 font-mono">{new Date(s.ts).toLocaleString()}</span>
                  <span className="ml-auto text-[11px] font-mono text-ink/60">
                    股 {s.effects.stocksPct > 0 ? '+' : ''}{s.effects.stocksPct}% · 美元 {s.effects.dollarIdxPct > 0 ? '+' : ''}{s.effects.dollarIdxPct}% · 民意 {s.effects.approvalPct > 0 ? '+' : ''}{s.effects.approvalPct}%
                  </span>
                </div>
                <div className="text-sm text-ink/80 whitespace-pre-wrap">{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
