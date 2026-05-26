// 外交模块 — 20 国对我们的态度 (-100..100)
// localStorage: presidentSim.diplomacy.v1
import { applyScoreDelta } from './scores';

export type Nation = {
  code: string;
  name: string;
  flag: string;
  attitude: number;       // -100..100
  trend: number[];        // 长度 30 (近 30 日态度)
  lastEvent?: string;
  ts: number;             // 最近事件时间
};

const KEY = 'presidentSim.diplomacy.v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function clampA(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-100, Math.min(100, Math.round(n)));
}

// 20 国种子(国旗 emoji + 初始态度)
export const NATIONS_SEED: Omit<Nation, 'trend' | 'ts'>[] = [
  { code: 'US', name: '美国',     flag: '🇺🇸', attitude: 70 },
  { code: 'CN', name: '中国',     flag: '🇨🇳', attitude: 10 },
  { code: 'JP', name: '日本',     flag: '🇯🇵', attitude: 60 },
  { code: 'KR', name: '韩国',     flag: '🇰🇷', attitude: 55 },
  { code: 'RU', name: '俄罗斯',   flag: '🇷🇺', attitude: -30 },
  { code: 'UK', name: '英国',     flag: '🇬🇧', attitude: 65 },
  { code: 'FR', name: '法国',     flag: '🇫🇷', attitude: 50 },
  { code: 'DE', name: '德国',     flag: '🇩🇪', attitude: 55 },
  { code: 'IT', name: '意大利',   flag: '🇮🇹', attitude: 45 },
  { code: 'CA', name: '加拿大',   flag: '🇨🇦', attitude: 70 },
  { code: 'AU', name: '澳大利亚', flag: '🇦🇺', attitude: 60 },
  { code: 'IN', name: '印度',     flag: '🇮🇳', attitude: 30 },
  { code: 'BR', name: '巴西',     flag: '🇧🇷', attitude: 25 },
  { code: 'MX', name: '墨西哥',   flag: '🇲🇽', attitude: 35 },
  { code: 'SA', name: '沙特',     flag: '🇸🇦', attitude: 20 },
  { code: 'IL', name: '以色列',   flag: '🇮🇱', attitude: 65 },
  { code: 'EG', name: '埃及',     flag: '🇪🇬', attitude: 15 },
  { code: 'ZA', name: '南非',     flag: '🇿🇦', attitude: 20 },
  { code: 'TR', name: '土耳其',   flag: '🇹🇷', attitude: 5 },
  { code: 'ID', name: '印尼',     flag: '🇮🇩', attitude: 30 },
];

function seed(): Nation[] {
  const now = Date.now();
  return NATIONS_SEED.map((n) => ({
    ...n,
    trend: new Array(30).fill(n.attitude),
    ts: now,
  }));
}

export function loadDiplomacy(): Nation[] {
  if (!isBrowser()) return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length === 20) return arr as Nation[];
    const s = seed();
    window.localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  } catch (e) {
    console.error('[diplomacy.load]', e);
    return seed();
  }
}

export function saveDiplomacy(ns: Nation[]): void {
  if (!isBrowser()) return;
  try { window.localStorage.setItem(KEY, JSON.stringify(ns)); } catch {}
}

export type DiplomacyAction = '会谈' | '制裁' | '援助' | '贸易';

export const ACTION_DELTA: Record<DiplomacyAction, [number, number]> = {
  '会谈': [5, 10],
  '制裁': [-15, -8],
  '援助': [8, 15],
  '贸易': [3, 8],
};

function randIn(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 对某国执行行动 — 返回新国家数组,并把后果联动到 scores (国际形象)
export function applyAction(nations: Nation[], code: string, action: DiplomacyAction): Nation[] {
  const [lo, hi] = ACTION_DELTA[action];
  const delta = randIn(lo, hi);
  const ts = Date.now();
  const next = nations.map((n) => {
    if (n.code !== code) return n;
    const newAtt = clampA(n.attitude + delta);
    const trend = [...n.trend.slice(1), newAtt];
    return { ...n, attitude: newAtt, trend, lastEvent: `${action} (${delta >= 0 ? '+' : ''}${delta})`, ts };
  });
  saveDiplomacy(next);
  // 联动国际形象 — 制裁负面,援助/会谈/贸易正面;按 delta/3 影响
  applyScoreDelta({
    key: '国际形象',
    delta: Math.round(delta / 3),
    reason: `${action}:${nations.find((n) => n.code === code)?.name ?? code}`,
    ts,
  });
  return next;
}

export type GlobalIndex = {
  avg: number;
  allies: number;   // attitude >= 60
  hostile: number;  // attitude <= -60
};

export function globalIndex(nations: Nation[]): GlobalIndex {
  const sum = nations.reduce((a, n) => a + n.attitude, 0);
  return {
    avg: nations.length ? Math.round(sum / nations.length) : 0,
    allies: nations.filter((n) => n.attitude >= 60).length,
    hostile: nations.filter((n) => n.attitude <= -60).length,
  };
}
