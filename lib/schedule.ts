import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type SchedulePriority = 'critical' | 'high' | 'medium' | 'low';
export type ScheduleCategory =
  | 'security'
  | 'economy'
  | 'diplomatic'
  | 'press'
  | 'personal'
  | 'ceremonial';

export type ScheduleItem = {
  id: string;
  start: string; // "HH:MM"
  end: string;
  title: string;
  location: string;
  priority: SchedulePriority;
  category: ScheduleCategory;
  attendees: string[];
};

export type Schedule = {
  date: string;
  items: ScheduleItem[];
};

export function loadSchedule(): Schedule {
  const p = join(process.cwd(), 'data', 'schedule.json');
  return JSON.parse(readFileSync(p, 'utf8')) as Schedule;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function durationMin(it: ScheduleItem): number {
  return toMin(it.end) - toMin(it.start);
}

export function getCurrentItem(s: Schedule, nowHHMM: string): ScheduleItem | null {
  const n = toMin(nowHHMM);
  return s.items.find((it) => toMin(it.start) <= n && n < toMin(it.end)) ?? null;
}

export function getUpcoming(s: Schedule, nowHHMM: string, count: number): ScheduleItem[] {
  const n = toMin(nowHHMM);
  return s.items.filter((it) => toMin(it.start) > n).slice(0, count);
}

export function getDensityByHour(s: Schedule): { hour: number; usedMin: number }[] {
  const buckets = new Map<number, number>();
  for (let h = 6; h <= 23; h++) buckets.set(h, 0);
  for (const it of s.items) {
    let cur = toMin(it.start);
    const end = toMin(it.end);
    while (cur < end) {
      const h = Math.floor(cur / 60);
      const minLeftInHour = (h + 1) * 60 - cur;
      const step = Math.min(minLeftInHour, end - cur);
      if (buckets.has(h)) buckets.set(h, (buckets.get(h) ?? 0) + step);
      cur += step;
    }
  }
  return Array.from(buckets.entries()).map(([hour, usedMin]) => ({ hour, usedMin }));
}

export const CATEGORY_COLOR: Record<ScheduleCategory, string> = {
  security:   '#c0392b',
  economy:    '#2c5f4f',
  diplomatic: '#0a1929',
  press:      '#7f5af0',
  personal:   '#94a3b8',
  ceremonial: '#c9a961',
};

export const CATEGORY_CN: Record<ScheduleCategory, string> = {
  security:   '安全',
  economy:    '经济',
  diplomatic: '外交',
  press:      '媒体',
  personal:   '私人',
  ceremonial: '礼仪',
};

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
