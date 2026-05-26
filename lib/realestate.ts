// 房产模块:12 核心城区均价 + 税价 + 买入/卖出
// 数值 approximate, configurable —— 仅用于模拟。CNY/㎡。

export type TaxRates = {
  /** 契税 % (买入加) */
  deedTax: number;
  /** 房产税 % (年化, 仅展示) */
  propertyTax: number;
  /** 转让税 % (卖出扣) */
  transferTax: number;
};

export type CityQuote = {
  city: string;
  district?: string;
  /** 均价 元/㎡ */
  avgPricePerSqm: number;
  /** 税率 % */
  tax: TaxRates;
  /** 7 日 sparkline,价格点 */
  trend7d: number[];
  /** 30 日成交量(套) */
  volume30d: number;
};

export type Holding = {
  id: string;
  city: string;
  district?: string;
  /** 面积 ㎡ */
  area: number;
  /** 买入单价(元/㎡, 含税) */
  buyPrice: number;
  buyTs: number;
  /** 当前估值(元, 总值) */
  currentValue: number;
};

export const MARKET_LS_KEY = 'presidentSim.realestate.market.v1';
export const HOLDINGS_LS_KEY = 'presidentSim.realestate.holdings.v1';

// approximate, configurable —— 2024-2025 公开数据近似(均价 元/㎡, 核心城区)
const SEED: Array<Omit<CityQuote, 'trend7d' | 'volume30d'>> = [
  { city: '北京', district: '海淀',   avgPricePerSqm: 92000, tax: { deedTax: 1.5, propertyTax: 1.2, transferTax: 2.0 } },
  { city: '上海', district: '浦东',   avgPricePerSqm: 88000, tax: { deedTax: 1.5, propertyTax: 1.2, transferTax: 2.0 } },
  { city: '广州', district: '天河',   avgPricePerSqm: 58000, tax: { deedTax: 1.0, propertyTax: 0.8, transferTax: 1.5 } },
  { city: '深圳', district: '南山',   avgPricePerSqm: 95000, tax: { deedTax: 1.5, propertyTax: 1.2, transferTax: 2.0 } },
  { city: '杭州', district: '西湖',   avgPricePerSqm: 52000, tax: { deedTax: 1.0, propertyTax: 0.6, transferTax: 1.5 } },
  { city: '成都', district: '锦江',   avgPricePerSqm: 22000, tax: { deedTax: 1.0, propertyTax: 0.5, transferTax: 1.0 } },
  { city: '南京', district: '鼓楼',   avgPricePerSqm: 38000, tax: { deedTax: 1.0, propertyTax: 0.6, transferTax: 1.5 } },
  { city: '苏州', district: '工业园', avgPricePerSqm: 36000, tax: { deedTax: 1.0, propertyTax: 0.6, transferTax: 1.5 } },
  { city: '武汉', district: '武昌',   avgPricePerSqm: 19000, tax: { deedTax: 1.0, propertyTax: 0.5, transferTax: 1.0 } },
  { city: '西安', district: '雁塔',   avgPricePerSqm: 16000, tax: { deedTax: 1.0, propertyTax: 0.5, transferTax: 1.0 } },
  { city: '重庆', district: '渝中',   avgPricePerSqm: 14500, tax: { deedTax: 1.0, propertyTax: 0.5, transferTax: 1.0 } },
  { city: '天津', district: '和平',   avgPricePerSqm: 28000, tax: { deedTax: 1.0, propertyTax: 0.6, transferTax: 1.5 } },
];

function jitter(base: number, pct = 0.005): number {
  // ±pct 波动
  const d = (Math.random() * 2 - 1) * pct;
  return Math.round(base * (1 + d));
}

function genTrend7d(base: number): number[] {
  const arr: number[] = [];
  let p = base * (1 + (Math.random() * 0.02 - 0.01));
  for (let i = 0; i < 7; i++) {
    p = p * (1 + (Math.random() * 0.01 - 0.005));
    arr.push(Math.round(p));
  }
  return arr;
}

/** 生成或恢复市场快照 */
export function loadMarket(): CityQuote[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(MARKET_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CityQuote[];
        if (Array.isArray(parsed) && parsed.length === SEED.length) return parsed;
      }
    } catch {}
  }
  return refreshMarket();
}

/** 按 seed 重新生成(±0.5% 波动) */
export function refreshMarket(): CityQuote[] {
  const out = SEED.map((s) => {
    const avg = jitter(s.avgPricePerSqm, 0.005);
    return {
      ...s,
      avgPricePerSqm: avg,
      trend7d: genTrend7d(avg),
      volume30d: 200 + Math.floor(Math.random() * 1800),
    } as CityQuote;
  });
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(MARKET_LS_KEY, JSON.stringify(out)); } catch {}
  }
  return out;
}

export function loadHoldings(): Holding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOLDINGS_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Holding[];
  } catch {}
  return [];
}

export function saveHoldings(list: Holding[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(HOLDINGS_LS_KEY, JSON.stringify(list)); } catch {}
}

export function totalCost(buyPrice: number, area: number, deedTaxPct: number): number {
  const base = buyPrice * area;
  return Math.round(base * (1 + deedTaxPct / 100));
}

export function sellNet(currentValue: number, transferTaxPct: number): number {
  return Math.round(currentValue * (1 - transferTaxPct / 100));
}

/** 扣减/加回 player.cash —— 优先 window.__PRES_SIM__.player, 失败则只发事件 */
export function adjustCash(delta: number): { ok: boolean; cash?: number } {
  if (typeof window === 'undefined') return { ok: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  try {
    const sim = w.__PRES_SIM__ = w.__PRES_SIM__ || {};
    sim.player = sim.player || { cash: 100_000_000 };
    sim.player.cash = (sim.player.cash || 0) + delta;
    return { ok: true, cash: sim.player.cash };
  } catch {
    return { ok: false };
  }
}

export function emitTx(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('pf:realestate-tx', { detail: payload }));
  } catch {}
}

export function fmtCNY(n: number): string {
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(2)}亿`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(1)}万`;
  return n.toLocaleString('zh-CN');
}

export function newHoldingId(): string {
  return `re_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** SVG pie 用颜色 */
export const CITY_COLORS = [
  '#c0392b', '#2c5f4f', '#c9a961', '#0a1929', '#e67e22',
  '#7f5af0', '#3b82f6', '#16a085', '#d35400', '#8e44ad',
  '#27ae60', '#2980b9',
];
