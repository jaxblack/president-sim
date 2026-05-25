import {
  loadSchedule,
  getCurrentItem,
  getUpcoming,
  getDensityByHour,
  durationMin,
  CATEGORY_COLOR,
  CATEGORY_CN,
  nowHHMM,
  type ScheduleItem,
} from '@/lib/schedule';
import SectionHeader from '../components/SectionHeader';

const ROW_HEIGHT = 18; // px per 15 min slot
const START_HOUR = 6;
const END_HOUR = 23; // inclusive (last row label = 23:00)
const SLOTS_PER_HOUR = 4;

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function topOf(hhmm: string): number {
  const m = toMin(hhmm);
  const baseMin = START_HOUR * 60;
  return ((m - baseMin) / 15) * ROW_HEIGHT;
}

function priorityBadge(p: ScheduleItem['priority']) {
  const map: Record<typeof p, { txt: string; cls: string }> = {
    critical: { txt: '🚨 CRITICAL', cls: 'bg-stamp-red/15 text-stamp-red border-stamp-red' },
    high:     { txt: 'HIGH',        cls: 'bg-alert/15 text-alert border-alert' },
    medium:   { txt: 'MED',         cls: 'bg-ink/10 text-ink/80 border-ink/40' },
    low:      { txt: 'LOW',         cls: 'bg-oval-green/10 text-oval-green border-oval-green/60' },
  };
  const v = map[p];
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 border rounded-sm ${v.cls}`}>
      {v.txt}
    </span>
  );
}

export default function SchedulePage() {
  const s = loadSchedule();
  const now = nowHHMM();
  const cur = getCurrentItem(s, now);
  const upcoming = getUpcoming(s, now, 3);

  const totalMeetings = s.items.length;
  const totalMin = s.items.reduce((a, it) => a + durationMin(it), 0);
  const criticalCount = s.items.filter((it) => it.priority === 'critical').length;
  const freeMin = (END_HOUR - START_HOUR + 1) * 60 - totalMin;

  const density = getDensityByHour(s);

  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  const railHeight = (END_HOUR - START_HOUR + 1) * 60 / 15 * ROW_HEIGHT;
  const nowTop = (() => {
    const m = toMin(now);
    if (m < START_HOUR * 60 || m > (END_HOUR + 1) * 60) return null;
    return ((m - START_HOUR * 60) / 15) * ROW_HEIGHT;
  })();

  return (
    <div className="space-y-6">
      <SectionHeader title="日程 · Daily Schedule" subtitle="potus calendar" icon="📅" />

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">今日总会议</div>
          <div className="font-display text-2xl text-ink mt-1">{totalMeetings}</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">总占用</div>
          <div className="font-display text-2xl text-ink mt-1">{Math.floor(totalMin / 60)}h {totalMin % 60}m</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">Critical 项</div>
          <div className="font-display text-2xl text-stamp-red mt-1">{criticalCount}</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">空闲</div>
          <div className="font-display text-2xl text-oval-green mt-1">{Math.floor(freeMin / 60)}h {freeMin % 60}m</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Timeline */}
        <div className="briefing-card relative overflow-hidden">
          <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3">
            Timeline · {s.date} · 当前 {now}
          </div>
          <div className="relative" style={{ height: railHeight }}>
            {/* Hour grid */}
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-ink/15 flex"
                style={{ top: i * SLOTS_PER_HOUR * ROW_HEIGHT, height: SLOTS_PER_HOUR * ROW_HEIGHT }}
              >
                <div className="w-12 text-[11px] font-mono text-ink/50 pr-2 text-right pt-0.5">
                  {String(h).padStart(2, '0')}:00
                </div>
                <div className="flex-1 border-l border-ink/20" />
              </div>
            ))}

            {/* Now line */}
            {nowTop !== null && (
              <div
                className="absolute left-12 right-0 border-t-2 border-stamp-red z-20 pointer-events-none"
                style={{ top: nowTop }}
              >
                <span className="absolute -top-3 -left-12 text-[10px] font-mono bg-stamp-red text-paper px-1 rounded">
                  NOW {now}
                </span>
              </div>
            )}

            {/* Items */}
            <div className="absolute left-12 right-2 top-0 bottom-0">
              {s.items.map((it) => {
                const top = topOf(it.start);
                const height = Math.max((durationMin(it) / 15) * ROW_HEIGHT - 2, 16);
                const color = CATEGORY_COLOR[it.category];
                const isCritical = it.priority === 'critical';
                const isCurrent = cur?.id === it.id;
                return (
                  <div
                    key={it.id}
                    className={`absolute left-0 right-0 rounded-md px-2 py-0.5 text-xs overflow-hidden transition-shadow ${isCurrent ? 'ring-2 ring-stamp-red shadow-briefing z-10' : ''}`}
                    style={{
                      top,
                      height,
                      background: color + '22',
                      borderLeft: `4px solid ${color}`,
                      borderTop: isCritical ? `1px solid ${color}` : undefined,
                      borderRight: isCritical ? `1px solid ${color}` : undefined,
                      borderBottom: isCritical ? `1px solid ${color}` : undefined,
                    }}
                    title={`${it.start}-${it.end} · ${it.title} @ ${it.location}`}
                  >
                    <div className="flex items-center gap-1 leading-tight">
                      <span className="font-mono text-[10px] text-ink/70">{it.start}</span>
                      {isCritical && <span>🚨</span>}
                      <span className="font-semibold text-ink truncate">{it.title}</span>
                    </div>
                    {height >= ROW_HEIGHT * 2 && (
                      <div className="text-[10px] text-ink/60 truncate">
                        {it.location} · {CATEGORY_CN[it.category]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar: current + upcoming + density */}
        <div className="space-y-4">
          <div className="briefing-card">
            <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-2">Now</div>
            {cur ? (
              <>
                <div className="font-display text-lg text-ink leading-tight">{cur.title}</div>
                <div className="text-[11px] text-ink/60 mt-1">{cur.start}–{cur.end} · {cur.location}</div>
                <div className="mt-2">{priorityBadge(cur.priority)}</div>
                {cur.attendees.length > 0 && (
                  <div className="text-[11px] text-ink/70 mt-2">参与:{cur.attendees.join(', ')}</div>
                )}
              </>
            ) : (
              <div className="text-sm text-ink/60">当前无安排</div>
            )}
          </div>

          <div className="briefing-card">
            <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-2">Up Next</div>
            <div className="space-y-3">
              {upcoming.length === 0 && <div className="text-sm text-ink/60">今日剩余无安排</div>}
              {upcoming.map((it) => (
                <div key={it.id} className="flex items-start gap-2 text-sm">
                  <div className="font-mono text-[11px] text-ink/60 w-12 flex-shrink-0 pt-0.5">{it.start}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink leading-tight truncate">{it.title}</div>
                    <div className="text-[11px] text-ink/55">{it.location} · {CATEGORY_CN[it.category]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="briefing-card">
            <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-2">小时密度</div>
            <div className="space-y-1">
              {density.map((d) => {
                const pct = Math.round((d.usedMin / 60) * 100);
                return (
                  <div key={d.hour} className="flex items-center gap-2 text-[11px]">
                    <span className="font-mono w-10 text-ink/60">{String(d.hour).padStart(2, '0')}:00</span>
                    <div className="flex-1 h-2 bg-paper-dark rounded-sm overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          background: pct >= 80 ? '#c0392b' : pct >= 50 ? '#e67e22' : '#2c5f4f',
                        }}
                      />
                    </div>
                    <span className="font-mono w-8 text-right text-ink/70">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
