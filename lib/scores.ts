// 国民评分 / Scores 模块 — 5 维 0-100
// localStorage:presidentSim.scores.v1, presidentSim.scores.history.v1

export const SCORE_KEYS = ['民意', '经济', '国际形象', '国家安全', '总分'] as const;
export type ScoreKey = typeof SCORE_KEYS[number];

export type Scores = Record<ScoreKey, number>;
export type ScoreEvent = { key: ScoreKey; delta: number; reason: string; ts: number };

const KEY = 'presidentSim.scores.v1';
const HIST_KEY = 'presidentSim.scores.history.v1';
const HIST_LIMIT = 200;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function defaults(): Scores {
  return { '民意': 55, '经济': 60, '国际形象': 50, '国家安全': 65, '总分': 58 };
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function loadScores(): Scores {
  if (!isBrowser()) return defaults();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = defaults();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const obj = JSON.parse(raw);
    const merged = { ...defaults(), ...obj };
    for (const k of SCORE_KEYS) merged[k] = clamp(merged[k]);
    return merged as Scores;
  } catch (e) {
    console.error('[scores.load]', e);
    return defaults();
  }
}

export function saveScores(s: Scores): void {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function loadHistory(): ScoreEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(HIST_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(-HIST_LIMIT) : [];
  } catch { return []; }
}

export function saveHistory(h: ScoreEvent[]): void {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(-HIST_LIMIT))); } catch {}
}

function recomputeTotal(s: Scores): Scores {
  // 总分 = 其他四项加权平均(可调)
  const total = clamp((s['民意'] * 0.3 + s['经济'] * 0.3 + s['国际形象'] * 0.2 + s['国家安全'] * 0.2));
  return { ...s, '总分': total };
}

export function applyScoreDelta(ev: ScoreEvent): Scores {
  const cur = loadScores();
  const next = { ...cur };
  if (ev.key !== '总分') {
    next[ev.key] = clamp((cur[ev.key] ?? 50) + ev.delta);
  } else {
    next['总分'] = clamp((cur['总分'] ?? 50) + ev.delta);
  }
  const recomputed = ev.key === '总分' ? next : recomputeTotal(next);
  saveScores(recomputed);
  const hist = loadHistory();
  hist.push(ev);
  saveHistory(hist);
  return recomputed;
}

export function resetScores(): Scores {
  const d = defaults();
  saveScores(d);
  saveHistory([]);
  return d;
}

// 30 日聚合(按天合计 delta) — 用于趋势
export function dailyTrend(history: ScoreEvent[], key: ScoreKey, days = 30): number[] {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const out = new Array(days).fill(0);
  for (const ev of history) {
    if (ev.key !== key) continue;
    const d = new Date(ev.ts); d.setHours(0, 0, 0, 0);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < days) out[days - 1 - diff] += ev.delta;
  }
  // 把 delta 序列累加并对齐当前值
  const curr = loadScores()[key] ?? 50;
  const series: number[] = new Array(days);
  let running = curr;
  series[days - 1] = running;
  for (let i = days - 2; i >= 0; i--) {
    running -= out[i + 1];
    series[i] = clamp(running);
  }
  return series;
}
