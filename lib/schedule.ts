// 客户端日程模块 — localStorage 持久化
// 旧的 SSR 版本(读 data/schedule.json)已弃用,由本模块替代

import { applyScoreDelta, type ScoreKey } from './scores';

export const SCHEDULE_TYPES = ['会议', '演讲', '外访', '签约', '公开', '私人'] as const;
export type ScheduleType = typeof SCHEDULE_TYPES[number];

export type ScheduleEffect = { key: string; delta: number };

export type ScheduleItem = {
  id: string;
  ts: number;            // 开始时间(ms)
  durationMin: number;
  title: string;
  type: ScheduleType;
  location?: string;
  participants?: string[];
  notes?: string;
  effects?: ScheduleEffect[];
};

const KEY = 'presidentSim.schedule.v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function seed(): ScheduleItem[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const mk = (offsetDays: number, h: number, m: number, title: string, type: ScheduleType, dur = 60, effects: ScheduleEffect[] = []): ScheduleItem => {
    const d = new Date(today); d.setDate(d.getDate() + offsetDays); d.setHours(h, m, 0, 0);
    return {
      id: 'seed-' + offsetDays + '-' + h + m + '-' + Math.random().toString(36).slice(2, 6),
      ts: d.getTime(),
      durationMin: dur,
      title, type,
      effects,
    };
  };
  return [
    mk(0, 9, 0, '晨间安全简报', '会议', 30, [{ key: '国家安全', delta: 1 }]),
    mk(0, 10, 30, '与国会领袖会面', '会议', 60, [{ key: '民意', delta: 2 }]),
    mk(0, 14, 0, '电视演讲:经济政策', '演讲', 45, [{ key: '民意', delta: 3 }, { key: '经济', delta: 1 }]),
    mk(1, 11, 0, '出访日本', '外访', 240, [{ key: '国际形象', delta: 5 }]),
    mk(2, 15, 0, '签署气候法案', '签约', 30, [{ key: '民意', delta: 4 }, { key: '国际形象', delta: 2 }]),
    mk(3, 19, 30, '与家人晚餐', '私人', 90),
  ];
}

export function loadSchedule(): ScheduleItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as ScheduleItem[];
  } catch (e) {
    console.error('[schedule.load]', e);
  }
  return [];
}

export function saveSchedule(items: ScheduleItem[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error('[schedule.save]', e);
  }
}

function newId(): string {
  return 'sc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

export function addItem(items: ScheduleItem[], it: ScheduleItem): ScheduleItem[] {
  const id = it.id && it.id.length > 0 ? it.id : newId();
  return [...items, { ...it, id }];
}

export function updateItem(items: ScheduleItem[], it: ScheduleItem): ScheduleItem[] {
  return items.map((x) => (x.id === it.id ? { ...it } : x));
}

export function deleteItem(items: ScheduleItem[], id: string): ScheduleItem[] {
  return items.filter((x) => x.id !== id);
}

function isValidScoreKey(k: string): k is ScoreKey {
  return k === '民意' || k === '经济' || k === '国际形象' || k === '国家安全' || k === '总分';
}

// 应用 effects 到全局分数 — 若 prev 提供,则只应用差额
export function applyEffectsForItem(curr: ScheduleItem, reason: string, prev?: ScheduleItem | null): void {
  if (!isBrowser()) return;
  const prevMap = new Map<string, number>();
  for (const e of prev?.effects ?? []) prevMap.set(e.key, (prevMap.get(e.key) ?? 0) + e.delta);
  const currMap = new Map<string, number>();
  for (const e of curr.effects ?? []) currMap.set(e.key, (currMap.get(e.key) ?? 0) + e.delta);
  const keys = new Set([...prevMap.keys(), ...currMap.keys()]);
  for (const k of keys) {
    if (!isValidScoreKey(k)) continue;
    const delta = (currMap.get(k) ?? 0) - (prevMap.get(k) ?? 0);
    if (delta !== 0) applyScoreDelta({ key: k, delta, reason, ts: Date.now() });
  }
}
