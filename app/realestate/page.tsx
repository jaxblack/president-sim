'use client';

import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import {
  type CityQuote, type Holding,
  loadMarket, refreshMarket, loadHoldings, saveHoldings,
  totalCost, sellNet, adjustCash, emitTx, fmtCNY, newHoldingId,
  CITY_COLORS,
} from '@/lib/realestate';

function Sparkline({ points }: { points: number[] }) {
  if (!points.length) return null;
  const W = 80, H = 24, P = 2;
  const min = Math.min(...points), max = Math.max(...points);
  const sx = (i: number) => P + (i / (points.length - 1 || 1)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  const up = points[points.length - 1] >= points[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="inline-block">
      <path d={d} fill="none" stroke={up ? '#2c5f4f' : '#c0392b'} strokeWidth={1.5} />
    </svg>
  );
}

function PieChart({ slices }: { slices: Array<{ label: string; value: number; color: string }> }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return <div className="text-ink/50 text-sm">无持仓</div>;
  const W = 220, R = 90, CX = W / 2, CY = W / 2;
  let acc = 0;
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg viewBox={`0 0 ${W} ${W}`} width={W} height={W}>
        {slices.map((s) => {
          const start = (acc / total) * Math.PI * 2;
          acc += s.value;
          const end = (acc / total) * Math.PI * 2;
          const x1 = CX + R * Math.sin(start), y1 = CY - R * Math.cos(start);
          const x2 = CX + R * Math.sin(end),   y2 = CY - R * Math.cos(end);
          const large = end - start > Math.PI ? 1 : 0;
          const d = `M ${CX} ${CY} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
          return <path key={s.label} d={d} fill={s.color} stroke="#fff" strokeWidth={1} />;
        })}
        <circle cx={CX} cy={CY} r={32} fill="#f7f1de" />
      </svg>
      <div className="text-xs space-y-1">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3" style={{ background: s.color }} />
            <span className="text-ink/80">{s.label}</span>
            <span className="text-ink/50 font-mono">{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type BuyModalState = { open: boolean; cq?: CityQuote };

export default function RealestatePage() {
  const [market, setMarket] = useState<CityQuote[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [buyModal, setBuyModal] = useState<BuyModalState>({ open: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMarket(loadMarket());
    setHoldings(loadHoldings());
  }, []);

  // 行情每 30s 抖动一次,持有估值跟随
  useEffect(() => {
    const t = setInterval(() => {
      const m = refreshMarket();
      setMarket(m);
      setHoldings((prev) => {
        const next = prev.map((h) => {
          const cq = m.find((x) => x.city === h.city);
          if (!cq) return h;
          return { ...h, currentValue: Math.round(cq.avgPricePerSqm * h.area) };
        });
        saveHoldings(next);
        return next;
      });
      setTick((x) => x + 1);
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const totalAsset = useMemo(() => holdings.reduce((s, h) => s + h.currentValue, 0), [holdings, tick]);
  const totalCostSum = useMemo(
    () => holdings.reduce((s, h) => s + h.buyPrice * h.area, 0),
    [holdings, tick],
  );
  const pnl = totalAsset - totalCostSum;

  const pieSlices = useMemo(() => {
    const byCity = new Map<string, number>();
    for (const h of holdings) byCity.set(h.city, (byCity.get(h.city) || 0) + h.currentValue);
    const arr = Array.from(byCity.entries()).map(([city, value], i) => ({
      label: city, value, color: CITY_COLORS[i % CITY_COLORS.length],
    }));
    return arr.sort((a, b) => b.value - a.value);
  }, [holdings, tick]);

  function onBuy(cq: CityQuote) { setBuyModal({ open: true, cq }); }
  function closeBuy() { setBuyModal({ open: false }); }

  function confirmBuy(area: number) {
    const cq = buyModal.cq;
    if (!cq || !area || area <= 0) return;
    const cost = totalCost(cq.avgPricePerSqm, area, cq.tax.deedTax);
    const r = adjustCash(-cost);
    const h: Holding = {
      id: newHoldingId(),
      city: cq.city,
      district: cq.district,
      area,
      buyPrice: cq.avgPricePerSqm,
      buyTs: Date.now(),
      currentValue: Math.round(cq.avgPricePerSqm * area),
    };
    const next = [...holdings, h];
    setHoldings(next); saveHoldings(next);
    emitTx({ type: 'buy', city: cq.city, area, cost, cashAfter: r.cash });
    closeBuy();
  }

  function sell(h: Holding) {
    const cq = market.find((x) => x.city === h.city);
    const transferPct = cq?.tax.transferTax ?? 1.5;
    const proceeds = sellNet(h.currentValue, transferPct);
    const r = adjustCash(proceeds);
    const next = holdings.filter((x) => x.id !== h.id);
    setHoldings(next); saveHoldings(next);
    emitTx({ type: 'sell', city: h.city, proceeds, cashAfter: r.cash });
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="房产 · Realestate" subtitle="12 核心城区 · 均价 + 税价 + 买卖" icon="🏘️" />

      {/* 大盘 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-2">总资产</div>
          <div className="font-mono text-2xl text-ink">¥{fmtCNY(totalAsset)}</div>
          <div className="text-xs text-ink/60 mt-1">持有 {holdings.length} 套</div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-2">未实现盈亏</div>
          <div className={`font-mono text-2xl ${pnl >= 0 ? 'text-oval-green' : 'text-stamp-red'}`}>
            {pnl >= 0 ? '+' : ''}¥{fmtCNY(pnl)}
          </div>
          <div className="text-xs text-ink/60 mt-1">
            成本 ¥{fmtCNY(totalCostSum)}
          </div>
        </div>
        <div className="briefing-card">
          <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-2">各城分布</div>
          <PieChart slices={pieSlices} />
        </div>
      </div>

      {/* 12 城网格 */}
      <div className="briefing-card">
        <div className="flex items-center mb-3">
          <div className="text-[11px] uppercase tracking-widest text-stamp-red">12 核心城区行情</div>
          <button
            onClick={() => setMarket(refreshMarket())}
            className="ml-auto text-xs px-2 py-1 border border-ink/30 rounded hover:bg-paper-dark"
          >刷新</button>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {market.map((cq) => (
            <div key={cq.city} className="border border-ink/20 rounded p-3 bg-paper-dark/30">
              <div className="flex items-baseline justify-between">
                <div className="font-display text-ink text-lg">{cq.city}</div>
                <div className="text-[10px] text-ink/50 font-mono">{cq.district}</div>
              </div>
              <div className="flex items-end justify-between mt-1">
                <div className="font-mono text-ink text-xl">¥{cq.avgPricePerSqm.toLocaleString('zh-CN')}<span className="text-[10px] text-ink/50">/㎡</span></div>
                <Sparkline points={cq.trend7d} />
              </div>
              <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-stamp-red/10 text-stamp-red border border-stamp-red/30">契税 {cq.tax.deedTax}%</span>
                <span className="px-1.5 py-0.5 rounded bg-ink/10 text-ink/80 border border-ink/20">房产税 {cq.tax.propertyTax}%</span>
                <span className="px-1.5 py-0.5 rounded bg-ink/10 text-ink/80 border border-ink/20">转让 {cq.tax.transferTax}%</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[10px] text-ink/50 font-mono">30d 成交 {cq.volume30d}</div>
                <button
                  onClick={() => onBuy(cq)}
                  className="text-xs px-2 py-1 bg-ink text-paper rounded hover:opacity-90"
                >📈 买入</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 持有列表 */}
      <div className="briefing-card">
        <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3">我的持有</div>
        {holdings.length === 0 ? (
          <div className="text-ink/50 text-sm py-4 text-center">尚无持有 — 在上方挑一座城开始</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-ink/60 border-b border-ink/20">
                  <th className="text-left py-2 pr-2">城市</th>
                  <th className="text-left">区</th>
                  <th className="text-right">面积</th>
                  <th className="text-right">买入价</th>
                  <th className="text-right">现估值</th>
                  <th className="text-right">盈亏</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const cost = h.buyPrice * h.area;
                  const diff = h.currentValue - cost;
                  const up = diff >= 0;
                  const cq = market.find((x) => x.city === h.city);
                  const net = cq ? sellNet(h.currentValue, cq.tax.transferTax) : h.currentValue;
                  return (
                    <tr key={h.id} className="border-b border-ink/10 last:border-0">
                      <td className="py-1.5 pr-2 font-display text-ink">{h.city}</td>
                      <td className="text-ink/70 text-xs">{h.district || '–'}</td>
                      <td className="text-right font-mono text-ink/80">{h.area} ㎡</td>
                      <td className="text-right font-mono text-ink/80">¥{h.buyPrice.toLocaleString('zh-CN')}</td>
                      <td className="text-right font-mono text-ink">¥{fmtCNY(h.currentValue)}</td>
                      <td className={`text-right font-mono ${up ? 'text-oval-green' : 'text-stamp-red'}`}>
                        {up ? '+' : ''}¥{fmtCNY(diff)}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => sell(h)}
                          className="text-xs px-2 py-1 border border-stamp-red/40 text-stamp-red rounded hover:bg-stamp-red/10"
                          title={`卖出净得 ¥${fmtCNY(net)}`}
                        >💰 卖出</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 买入弹窗 */}
      {buyModal.open && buyModal.cq && (
        <BuyModal cq={buyModal.cq} onClose={closeBuy} onConfirm={confirmBuy} />
      )}
    </div>
  );
}

function BuyModal({ cq, onClose, onConfirm }: { cq: CityQuote; onClose: () => void; onConfirm: (area: number) => void }) {
  const [area, setArea] = useState(90);
  const cost = totalCost(cq.avgPricePerSqm, area, cq.tax.deedTax);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper border-2 border-ink rounded-lg p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-xl text-ink mb-1">买入 · {cq.city}</div>
        <div className="text-xs text-ink/60 mb-3">{cq.district} · 均价 ¥{cq.avgPricePerSqm.toLocaleString('zh-CN')}/㎡</div>
        <label className="block text-xs text-ink/70 mb-1">面积(㎡)</label>
        <input
          type="number"
          min={1}
          value={area}
          onChange={(e) => setArea(Number(e.target.value) || 0)}
          className="w-full text-sm px-2 py-1.5 border border-ink/30 rounded bg-paper-dark/40 font-mono mb-3"
        />
        <div className="text-xs text-ink/70 space-y-1 mb-4">
          <div className="flex justify-between"><span>房款</span><span className="font-mono">¥{fmtCNY(cq.avgPricePerSqm * area)}</span></div>
          <div className="flex justify-between"><span>契税 ({cq.tax.deedTax}%)</span><span className="font-mono">¥{fmtCNY(cq.avgPricePerSqm * area * cq.tax.deedTax / 100)}</span></div>
          <div className="flex justify-between border-t border-ink/20 pt-1"><span className="text-ink font-display">合计</span><span className="font-mono text-ink">¥{fmtCNY(cost)}</span></div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 text-sm px-3 py-1.5 border border-ink/30 rounded hover:bg-paper-dark">取消</button>
          <button onClick={() => onConfirm(area)} className="flex-1 text-sm px-3 py-1.5 bg-ink text-paper rounded hover:opacity-90">确认买入</button>
        </div>
      </div>
    </div>
  );
}
