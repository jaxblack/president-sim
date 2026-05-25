'use client';

export type Priority = 'high' | 'med' | 'low';

const LABEL: Record<Priority, string> = {
  high: '高 · HIGH',
  med: '中 · MED',
  low: '低 · LOW',
};

export default function PriorityBadge({ level }: { level: Priority }) {
  return <span className={`priority-badge ${level}`}>{LABEL[level]}</span>;
}
