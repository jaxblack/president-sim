'use client';

import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import type { Quote, RatePoint, CurvePoint } from '@/lib/market';
import { DEFAULT_WATCHLIST, fetchQuotes, fetchRates, fetchYieldCurve } from '@/lib/market';
import { WATCHLIST_LS_KEY } from '@/lib/fed';

type Tab = 'stocks' | 'rates';

function fmtNum(n: number, digits = 2) {
  return Number.isFinite(n) ? n.toFixed(digits) : '–';
}
function fmtVol(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '–';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function loadWatchlist(): string[] {
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
  try {
    const raw = localStorage.getItem(WATCHLIST_LS_KEY);
    if (!raw) return DEFAULT_WATCHLIST;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.every((x) => typeof x === 'string') && arr.length) return arr;
  } catch {}
  return DEFAULT_WATCHLIST;
}

function saveWatchlist(list: string[]) {
  try { localStorage.setItem(WATCHLIST_LS_KEY, JSON.stringify(list)); } catch {}
}

function YieldCurve({ curve }: { curve: CurvePoint[] }) {
  if (!curve.length) return null;
  const W = 320, H = 140, P = 28;
  const xs = curve.map((c) => c.years);
  const ys = curve.map((c) => c.yieldPct);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys) - 0.2, yMax = Math.max(...ys) + 0.2;
  const sx = (v: number) => P + ((v - xMin) / (xMax - xMin || 1)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - yMin) / (yMax - yMin || 1)) * (H - 2 * P);
  const path = curve.map((c, i) => `${i === 0 ? 'M' : 'L'} ${sx(c.years).toFixed(1)} ${sy(c.yieldPct).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md">
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} fill="none" stroke="#e8e0cc" />
      <path d={path} fill="none" stroke="#c0392b" strokeWidth={2} />
      {curve.map((c) => (
        <g key={c.tenor}>
          <circle cx={sx(c.years)} cy={sy(c.yieldPct)} r={3} fill="#1c2331" />
          <text x={sx(c.years)} y={H - 8} textAnchor="middle" fontSize="10" fill="#1c2331" fontFamily="monospace">
            {c.tenor}
          </text>
          <text x={sx(c.years)} y={sy(c.yieldPct) - 8} textAnchor="middle" fontSize="9" fill="#c0392b" fontFamily="monospace">
            {c.yieldPct.toFixed(2)}
          </text>
        </g>
      ))}
      <text x={P} y={16} fontSize="11" fontFamily="'Bree Serif',serif" fill="#1c2331">Yield Curve (US Treasury)</text>
    </svg>
  );
}

export default function MarketPage() {
  const [tab, setTab] = useState<Tab>('stocks');
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [rates, setRates] = useState<RatePoint[]>([]);
  const [curve, setCurve] = useState<CurvePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [addSym, setAddSym] = useState('');
  const [lastTick, setLastTick] = useState<number>(0);

  useEffect(() => { setWatchlist(loadWatchlist()); }, []);

  // 行情轮询(5 秒)— 直接从客户端调用上游(失败回退 mock 由 lib 内部完成)
  useEffect(() => {
    let cancel = false;
    async function tick() {
      setLoading(true); setErr(null);
      try {
        const qs = await fetchQuotes(watchlist);
        if (!cancel) { setQuotes(qs); setLastTick(Date.now()); }
      } catch (e) {
        if (!cancel) setErr((e as Error).message);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    tick();
    const t = setInterval(tick, 5000);
    return () => { cancel = true; clearInterval(t); };
  }, [watchlist]);

  // 利率拉取(60 秒)
  useEffect(() => {
    let cancel = false;
    async function tick() {
      try {
        const [rs, cv] = await Promise.all([fetchRates(), fetchYieldCurve()]);
        if (!cancel) { setRates(rs); setCurve(cv); }
      } catch {}
    }
    tick();
    const t = setInterval(tick, 60000);
    return () => { cancel = true; clearInterval(t); };
  }, []);

  function addSymbol() {
    const s = addSym.trim().toUpperCase();
    if (!s) return;
    if (watchlist.includes(s)) { setAddSym(''); return; }
    const next = [...watchlist, s];
    setWatchlist(next); saveWatchlist(next); setAddSym('');
  }
  function removeSymbol(s: string) {
    const next = watchlist.filter((x) => x !== s);
    setWatchlist(next); saveWatchlist(next);
  }
  function resetWatchlist() {
    setWatchlist(DEFAULT_WATCHLIST); saveWatchlist(DEFAULT_WATCHLIST);
  }

  const usingMock = useMemo(() => quotes.some((q) => q.mock), [quotes]);
  const ratesMock = useMemo(() => rates.some((r) => r.mock), [rates]);

  return (
    <div className="space-y-6">
      <SectionHeader title="市场 · Markets" subtitle="us equities · treasuries · fed" icon="📈" />

      {/* tab 切换 */}
      <div className="flex gap-2 text-sm font-display">
        {(['stocks', 'rates'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md border ${tab === t ? 'bg-ink text-paper border-ink' : 'border-ink/30 text-ink hover:bg-paper-dark'}`}
          >
            {t === 'stocks' ? '美股行情' : '美债 / 利率'}
          </button>
        ))}
        <div className="ml-auto text-[11px] text-ink/55 font-mono self-center">
          {loading ? '…fetching' : lastTick ? `updated ${new Date(lastTick).toLocaleTimeString()}` : ''}
          {usingMock && tab === 'stocks' && <span className="ml-2 text-stamp-red">[MOCK]</span>}
          {ratesMock && tab === 'rates' && <span className="ml-2 text-stamp-red">[MOCK]</span>}
        </div>
      </div>

      {tab === 'stocks' && (
        <>
          <div className="briefing-card">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="text-[11px] uppercase tracking-widest text-stamp-red">Watchlist</div>
              <input
                value={addSym}
                onChange={(e) => setAddSym(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
                placeholder="加 ticker (例 NFLX, ^DJI)"
                className="ml-auto text-sm px-2 py-1 border border-ink/30 rounded bg-paper-dark/40 font-mono"
              />
              <button onClick={addSymbol} className="text-sm px-3 py-1 border border-ink/30 rounded hover:bg-paper-dark">添加</button>
              <button onClick={resetWatchlist} className="text-sm px-3 py-1 border border-ink/30 rounded hover:bg-paper-dark">重置</button>
            </div>
            {err && <div className="text-stamp-red text-xs mb-2">⚠ {err}</div>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-ink/60 border-b border-ink/20">
                    <th className="text-left py-2 pr-2">代码</th>
                    <th className="text-left">名称</th>
                    <th className="text-right">价格</th>
                    <th className="text-right">涨跌</th>
                    <th className="text-right">涨跌幅</th>
                    <th className="text-right">成交量</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => {
                    const up = q.change >= 0;
                    return (
                      <tr key={q.symbol} className="border-b border-ink/10 last:border-0">
                        <td className="py-1.5 pr-2 font-mono text-ink">{q.symbol}</td>
                        <td className="text-ink/80 truncate max-w-[260px]">{q.name}</td>
                        <td className="text-right font-mono text-ink">{fmtNum(q.price)}</td>
                        <td className={`text-right font-mono ${up ? 'text-oval-green' : 'text-stamp-red'}`}>
                          {up ? '+' : ''}{fmtNum(q.change)}
                        </td>
                        <td className={`text-right font-mono ${up ? 'text-oval-green' : 'text-stamp-red'}`}>
                          {up ? '+' : ''}{fmtNum(q.changePct)}%
                        </td>
                        <td className="text-right font-mono text-ink/70">{fmtVol(q.volume)}</td>
                        <td className="text-right">
                          <button
                            onClick={() => removeSymbol(q.symbol)}
                            className="text-[11px] text-ink/40 hover:text-stamp-red px-1"
                            title="移除"
                          >×</button>
                        </td>
                      </tr>
                    );
                  })}
                  {quotes.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-ink/50 py-6">无数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-ink/50 mt-2 font-mono">
              5s 轮询 · 数据源 Yahoo Finance(失败回退本地 mock)· watchlist 存 localStorage[{WATCHLIST_LS_KEY}]
            </div>
          </div>
        </>
      )}

      {tab === 'rates' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="briefing-card">
            <div className="text-[11px] uppercase tracking-widest text-stamp-red mb-3">Key Rates</div>
            <div className="space-y-2">
              {rates.map((r) => (
                <div key={r.id} className="flex items-baseline gap-3 border-b border-ink/10 last:border-0 pb-1.5">
                  <div className="flex-1 text-ink">{r.name}</div>
                  <div className="font-mono text-lg text-ink">{r.value.toFixed(2)}<span className="text-xs text-ink/50">{r.unit}</span></div>
                  <div className="text-[10px] text-ink/50 font-mono w-20 text-right">{r.date}{r.mock && ' (mock)'}</div>
                </div>
              ))}
              {rates.length === 0 && <div className="text-ink/50 text-sm">加载中…</div>}
            </div>
            <div className="text-[11px] text-ink/50 mt-3 font-mono">
              数据源 FRED (St. Louis Fed)· 60s 刷新
            </div>
          </div>
          <div className="briefing-card flex items-center justify-center">
            <YieldCurve curve={curve} />
          </div>
        </div>
      )}
    </div>
  );
}
