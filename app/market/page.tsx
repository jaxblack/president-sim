'use client';

import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import type { Quote, RatePoint, RateSeries } from '@/lib/market';
import { DEFAULT_WATCHLIST, MARKET_WATCHLIST_LS_KEY, fetchQuotes, fetchRates, fetchRateSeries } from '@/lib/market';

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
    const raw = localStorage.getItem(MARKET_WATCHLIST_LS_KEY);
    if (!raw) return DEFAULT_WATCHLIST;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.every((x) => typeof x === 'string') && arr.length) return arr;
  } catch {}
  return DEFAULT_WATCHLIST;
}

function saveWatchlist(list: string[]) {
  try { localStorage.setItem(MARKET_WATCHLIST_LS_KEY, JSON.stringify(list)); } catch {}
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (!values?.length) return null;
  const W = 110, H = 34, P = 3;
  const min = Math.min(...values), max = Math.max(...values);
  const x = (i: number) => P + (i / Math.max(1, values.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-28"><path d={path} fill="none" stroke={positive ? '#2c5f4f' : '#c0392b'} strokeWidth="2" /></svg>;
}

function RateChart({ series }: { series: RateSeries[] }) {
  const all = series.flatMap((s) => s.points.map((p) => p.value));
  if (!all.length) return <div className="text-ink/50 text-sm">加载中…</div>;
  const W = 420, H = 180, P = 30;
  const min = Math.min(...all) - 0.1, max = Math.max(...all) + 0.1;
  const x = (i: number, len: number) => P + (i / Math.max(1, len - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const colors = ['#c0392b', '#2c5f4f', '#1c2331'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg">
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} fill="none" stroke="#e8e0cc" />
      {series.map((s, si) => {
        const path = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i, s.points.length).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
        return <path key={s.id} d={path} fill="none" stroke={colors[si % colors.length]} strokeWidth={2} />;
      })}
      <text x={P} y={18} fontSize="11" fontFamily="'Bree Serif',serif" fill="#1c2331">FRED · last 30 points</text>
      {series.map((s, i) => <text key={s.id} x={P} y={H - 10 - i * 14} fontSize="10" fontFamily="monospace" fill={colors[i % colors.length]}>{s.id}</text>)}
    </svg>
  );
}

export default function MarketPage() {
  const [tab, setTab] = useState<Tab>('stocks');
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [rates, setRates] = useState<RatePoint[]>([]);
  const [rateSeries, setRateSeries] = useState<RateSeries[]>([]);
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
        const [rs, series] = await Promise.all([fetchRates(), fetchRateSeries()]);
        if (!cancel) { setRates(rs); setRateSeries(series); }
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
                    <th className="text-right">7日</th>
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
                        <td className="text-right"><Sparkline values={q.sparkline} positive={up} /></td>
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
                    <tr><td colSpan={8} className="text-center text-ink/50 py-6">无数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-ink/50 mt-2 font-mono">
              5s 轮询 · 数据源 /api/market/quotes → Yahoo Finance(失败回退 mock) · localStorage[{MARKET_WATCHLIST_LS_KEY}]
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
            <RateChart series={rateSeries} />
          </div>
        </div>
      )}
    </div>
  );
}
