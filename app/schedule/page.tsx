'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  loadSchedule,
  saveSchedule,
  addItem,
  updateItem,
  deleteItem,
  applyEffectsForItem,
  SCHEDULE_TYPES,
  type ScheduleItem,
  type ScheduleType,
} from '@/lib/schedule';

type View = 'week' | 'month';

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Monday start
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDay(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateInputVal(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateInputVal(s: string): number {
  return new Date(s).getTime();
}

const TYPE_COLOR: Record<ScheduleType, string> = {
  '会议': '#0a1929',
  '演讲': '#7f5af0',
  '外访': '#2c5f4f',
  '签约': '#c9a961',
  '公开': '#e67e22',
  '私人': '#94a3b8',
};

const SCORE_KEYS = ['民意', '经济', '国际形象', '国家安全', '总分'] as const;

export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(loadSchedule());
    setReady(true);
  }, []);

  const persist = (next: ScheduleItem[]) => {
    setItems(next);
    saveSchedule(next);
  };

  const openNew = (date: Date) => {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    setEditing({
      id: '',
      ts: d.getTime(),
      durationMin: 60,
      title: '',
      type: '会议',
      location: '',
      participants: [],
      notes: '',
      effects: [],
    });
    setIsNew(true);
  };

  const openEdit = (it: ScheduleItem) => {
    setEditing({ ...it, participants: [...(it.participants ?? [])], effects: [...(it.effects ?? [])] });
    setIsNew(false);
  };

  const saveEditing = () => {
    if (!editing) return;
    if (!editing.title.trim()) return;
    if (isNew) {
      const next = addItem(items, editing);
      persist(next);
      // 应用 effects 到分数
      applyEffectsForItem(editing, '日程: ' + editing.title);
    } else {
      const prev = items.find((x) => x.id === editing.id);
      const next = updateItem(items, editing);
      persist(next);
      // 若 effects 改变,把差额应用
      if (prev) applyEffectsForItem(editing, '日程更新: ' + editing.title, prev);
    }
    setEditing(null);
  };

  const removeEditing = () => {
    if (!editing || isNew) {
      setEditing(null);
      return;
    }
    persist(deleteItem(items, editing.id));
    setEditing(null);
  };

  // === 视图数据 ===
  const cells = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }
    const start = startOfMonth(anchor);
    const dow = (start.getDay() + 6) % 7;
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - dow);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [view, anchor]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const it of items) {
      const d = new Date(it.ts);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.ts - b.ts);
    return map;
  }, [items]);

  const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const shift = (delta: number) => {
    const d = new Date(anchor);
    if (view === 'week') d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setAnchor(d);
  };

  if (!ready) return <div className="text-ink/60">加载日程…</div>;

  const todayKey = dayKey(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl text-ink">📅 日程 · Schedule</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="px-3 py-1 border border-ink/30 rounded hover:bg-paper-dark">‹</button>
          <button onClick={() => setAnchor(new Date())} className="px-3 py-1 border border-ink/30 rounded hover:bg-paper-dark text-sm">今天</button>
          <button onClick={() => shift(1)} className="px-3 py-1 border border-ink/30 rounded hover:bg-paper-dark">›</button>
          <div className="ml-2 flex rounded overflow-hidden border border-ink/30">
            <button onClick={() => setView('week')} className={`px-3 py-1 text-sm ${view === 'week' ? 'bg-ink text-paper' : 'hover:bg-paper-dark'}`}>周</button>
            <button onClick={() => setView('month')} className={`px-3 py-1 text-sm ${view === 'month' ? 'bg-ink text-paper' : 'hover:bg-paper-dark'}`}>月</button>
          </div>
          <button
            onClick={() => openNew(new Date())}
            className="ml-2 px-3 py-1 bg-stamp-red text-paper rounded text-sm hover:opacity-90"
          >
            + 新增
          </button>
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-widest text-ink/60">
        {view === 'week'
          ? `${fmtDay(cells[0])} – ${fmtDay(cells[6])}`
          : `${anchor.getFullYear()} 年 ${anchor.getMonth() + 1} 月`}
      </div>

      <div className={`grid gap-1 ${view === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
        {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
          <div key={w} className="text-[11px] font-display text-ink/60 text-center pb-1">{w}</div>
        ))}
        {cells.map((d) => {
          const key = dayKey(d);
          const dayItems = itemsByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const dim = view === 'month' && d.getMonth() !== anchor.getMonth();
          return (
            <div
              key={key + d.toISOString()}
              className={`border ${isToday ? 'border-stamp-red' : 'border-ink/20'} rounded p-1 cursor-pointer hover:bg-paper-dark/60 transition-colors min-h-[100px] ${dim ? 'opacity-40' : ''}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).dataset.evt) return;
                openNew(d);
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-mono ${isToday ? 'text-stamp-red font-bold' : 'text-ink/60'}`}>{fmtDay(d)}</span>
                <span className="text-[10px] text-ink/40">{dayItems.length}</span>
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, view === 'week' ? 8 : 3).map((it) => {
                  const t = new Date(it.ts);
                  return (
                    <div
                      key={it.id}
                      data-evt="1"
                      onClick={(e) => { e.stopPropagation(); openEdit(it); }}
                      className="text-[10px] px-1 py-0.5 rounded text-paper truncate cursor-pointer hover:opacity-80"
                      style={{ background: TYPE_COLOR[it.type] }}
                      title={`${pad(t.getHours())}:${pad(t.getMinutes())} ${it.title}`}
                    >
                      {pad(t.getHours())}:{pad(t.getMinutes())} {it.title}
                    </div>
                  );
                })}
                {dayItems.length > (view === 'week' ? 8 : 3) && (
                  <div className="text-[10px] text-ink/50">+{dayItems.length - (view === 'week' ? 8 : 3)} 更多</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div
            className="bg-paper border-2 border-ink rounded-briefing p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-ink">{isNew ? '新建日程' : '编辑日程'}</h3>
              <button onClick={() => setEditing(null)} className="text-ink/60 hover:text-ink">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-ink/60 mb-1">标题 *</label>
                <input
                  className="w-full border border-ink/30 rounded px-2 py-1 bg-paper"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="例:与日本首相会谈"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-ink/60 mb-1">开始</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-ink/30 rounded px-2 py-1 bg-paper"
                    value={toDateInputVal(editing.ts)}
                    onChange={(e) => setEditing({ ...editing, ts: fromDateInputVal(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-ink/60 mb-1">时长(分)</label>
                  <input
                    type="number" min={5} step={5}
                    className="w-full border border-ink/30 rounded px-2 py-1 bg-paper"
                    value={editing.durationMin}
                    onChange={(e) => setEditing({ ...editing, durationMin: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-ink/60 mb-1">类型</label>
                  <select
                    className="w-full border border-ink/30 rounded px-2 py-1 bg-paper"
                    value={editing.type}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value as ScheduleType })}
                  >
                    {SCHEDULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-ink/60 mb-1">地点</label>
                  <input
                    className="w-full border border-ink/30 rounded px-2 py-1 bg-paper"
                    value={editing.location ?? ''}
                    onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-ink/60 mb-1">参与者(逗号分隔)</label>
                <input
                  className="w-full border border-ink/30 rounded px-2 py-1 bg-paper"
                  value={(editing.participants ?? []).join(', ')}
                  onChange={(e) => setEditing({ ...editing, participants: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-ink/60 mb-1">备注</label>
                <textarea
                  className="w-full border border-ink/30 rounded px-2 py-1 bg-paper"
                  rows={2}
                  value={editing.notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-ink/60 mb-2">分值影响 (Effects)</label>
                <div className="space-y-1">
                  {(editing.effects ?? []).map((ef, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        className="border border-ink/30 rounded px-2 py-1 bg-paper text-xs flex-1"
                        value={ef.key}
                        onChange={(e) => {
                          const eff = [...(editing.effects ?? [])];
                          eff[i] = { ...eff[i], key: e.target.value };
                          setEditing({ ...editing, effects: eff });
                        }}
                      >
                        {SCORE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <input
                        type="number"
                        className="w-20 border border-ink/30 rounded px-2 py-1 bg-paper text-xs"
                        value={ef.delta}
                        onChange={(e) => {
                          const eff = [...(editing.effects ?? [])];
                          eff[i] = { ...eff[i], delta: Number(e.target.value) };
                          setEditing({ ...editing, effects: eff });
                        }}
                      />
                      <button
                        onClick={() => {
                          const eff = [...(editing.effects ?? [])];
                          eff.splice(i, 1);
                          setEditing({ ...editing, effects: eff });
                        }}
                        className="text-stamp-red text-xs hover:underline"
                      >删</button>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditing({ ...editing, effects: [...(editing.effects ?? []), { key: '民意', delta: 1 }] })}
                    className="text-xs text-stamp-red hover:underline"
                  >+ 新增 effect</button>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-5">
              <button
                onClick={removeEditing}
                className="px-3 py-1.5 text-sm text-stamp-red border border-stamp-red rounded hover:bg-stamp-red hover:text-paper"
              >
                {isNew ? '取消' : '删除'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm border border-ink/30 rounded">关闭</button>
                <button onClick={saveEditing} className="px-4 py-1.5 text-sm bg-ink text-paper rounded hover:opacity-90">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
