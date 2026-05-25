import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Allocation = {
  class: string;
  usd: number;
  pct: number;
  note?: string;
};

export type Property = {
  id: string;
  name: string;
  city: string;
  country: string;
  sizeSqm: number;
  valueUsd: number;
  acquiredYear: number;
  mortgageUsd: number;
  monthlyRentUsd: number;
  type: string;
};

export type Portfolio = {
  netWorthUsd: number;
  asOf: string;
  allocation: Allocation[];
  properties: Property[];
};

export function loadPortfolio(): Portfolio {
  const p = join(process.cwd(), 'data', 'portfolio.json');
  return JSON.parse(readFileSync(p, 'utf8')) as Portfolio;
}

export type Kpis = {
  netWorthUsd: number;
  monthlyPassiveUsd: number;
  liabilityRatio: number;
  assetClasses: number;
  propertyCount: number;
  propertyEquityUsd: number;
};

export function computeKpis(pf: Portfolio): Kpis {
  const monthlyPassive = pf.properties.reduce((s, p) => s + p.monthlyRentUsd, 0);
  const totalMortgage = pf.properties.reduce((s, p) => s + p.mortgageUsd, 0);
  const propertyValue = pf.properties.reduce((s, p) => s + p.valueUsd, 0);
  return {
    netWorthUsd: pf.netWorthUsd,
    monthlyPassiveUsd: monthlyPassive,
    liabilityRatio: totalMortgage / pf.netWorthUsd,
    assetClasses: pf.allocation.length,
    propertyCount: pf.properties.length,
    propertyEquityUsd: propertyValue - totalMortgage,
  };
}

// 用于 SVG donut 的颜色调色板(7 段)
export const ALLOC_COLORS = [
  '#2c5f4f', // 油绿
  '#c9a961', // 金
  '#0a1929', // 深海军
  '#c0392b', // 印章红
  '#e67e22', // 琥珀
  '#7f5af0', // 紫
  '#3b82f6', // 蓝
];
