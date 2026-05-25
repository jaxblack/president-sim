import { loadPortfolio, computeKpis, ALLOC_COLORS, type Allocation } from '@/lib/portfolio';
import SectionHeader from '../components/SectionHeader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
}

function pctStr(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

// SVG donut chart - 纯手写,无图表库
function Donut({ data }: { data: Allocation[] }) {
  const cx = 100, cy = 100, r = 70, stroke = 28;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const total = data.reduce((s, d) => s + d.pct, 0) || 100;
  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[260px]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8e0cc" strokeWidth={stroke} />
      {data.map((d, i) => {
        const frac = d.pct / total;
        const len = frac * C;
        const dash = `${len} ${C - len}`;
        const seg = (
          <circle
            key={d.class}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={ALLOC_COLORS[i % ALLOC_COLORS.length]}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += len;
        return seg;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontFamily="'Bree Serif',serif" fontSize="16" fill="#1c2331">
        净资产
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="monospace" fontSize="18" fill="#c0392b" fontWeight="700">
        {fmtUsd(data.reduce((s, d) => s + d.usd, 0))}
      </text>
    </svg>
  );
}

export default function PortfolioPage() {
  const pf = loadPortfolio();
  const k = computeKpis(pf);

  return (
    <div className="space-y-6">
      <SectionHeader title="资产 · Personal Assets" subtitle="portfolio & holdings" icon="💼" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">净资产</div>
          <div className="font-display text-2xl text-ink mt-1">{fmtUsd(k.netWorthUsd)}</div>
          <div className="text-[11px] text-ink/50 mt-1">截至 {pf.asOf}</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">月被动收入</div>
          <div className="font-display text-2xl text-oval-green mt-1">{fmtUsd(k.monthlyPassiveUsd)}</div>
          <div className="text-[11px] text-ink/50 mt-1">{k.propertyCount} 套房产租金</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">负债率</div>
          <div className="font-display text-2xl text-stamp-red mt-1">{pctStr(k.liabilityRatio)}</div>
          <div className="text-[11px] text-ink/50 mt-1">按揭 / 净资产</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-ink/60">资产类别</div>
          <div className="font-display text-2xl text-ink mt-1">{k.assetClasses}</div>
          <div className="text-[11px] text-ink/50 mt-1">分散度 OK</div>
        </div>
      </div>

      {/* 配置饼图 + 明细 */}
      <div className="briefing-card">
        <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3">Asset Allocation</div>
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="flex justify-center">
            <Donut data={pf.allocation} />
          </div>
          <div className="space-y-2">
            {pf.allocation.map((a, i) => (
              <div key={a.class} className="flex items-center gap-3 text-sm">
                <span
                  className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-ink font-medium">{a.class}</div>
                  {a.note && <div className="text-[11px] text-ink/50 truncate">{a.note}</div>}
                </div>
                <div className="text-right">
                  <div className="font-mono text-ink">{fmtUsd(a.usd)}</div>
                  <div className="text-[11px] text-ink/50">{a.pct.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 房产列表 */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3 px-1">Real Estate Holdings</div>
        <div className="grid md:grid-cols-3 gap-4">
          {pf.properties.map((p) => {
            const equity = p.valueUsd - p.mortgageUsd;
            const monthlyMortgageEst = p.mortgageUsd * 0.0045; // 粗估 5.4% APR / 12
            const netCash = p.monthlyRentUsd - monthlyMortgageEst;
            return (
              <div key={p.id} className="briefing-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display text-lg text-ink leading-tight">{p.name}</div>
                  <span className="seal text-xs">🏠</span>
                </div>
                <div className="text-[11px] uppercase tracking-widest text-ink/60 mt-1">
                  {p.city} · {p.country} · {p.sizeSqm}㎡ · {p.acquiredYear}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-[10px] uppercase text-ink/50">估值</div>
                    <div className="font-mono text-ink">{fmtUsd(p.valueUsd)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-ink/50">按揭</div>
                    <div className="font-mono text-stamp-red">{fmtUsd(p.mortgageUsd)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-ink/50">权益</div>
                    <div className="font-mono text-oval-green">{fmtUsd(equity)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-ink/50">月租金</div>
                    <div className="font-mono text-ink">{fmtUsd(p.monthlyRentUsd)}</div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-dashed border-ink/20 text-[11px] text-ink/60">
                  净现金流 ≈ <span className={netCash >= 0 ? 'text-oval-green font-semibold' : 'text-stamp-red font-semibold'}>{netCash >= 0 ? '+' : ''}{fmtUsd(Math.round(netCash))}/月</span>
                  <span className="float-right">{p.type}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
