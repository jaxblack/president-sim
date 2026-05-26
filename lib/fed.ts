// 美联储操控看板的数据/状态模型(服务端默认值 + 客户端 localStorage 接管)
// 持久化 key: presidentSim.fed.v1

export type Stance = 'hawkish' | 'neutral' | 'dovish';
export type QeMode = 'qe' | 'qt' | 'off';

export type FedHistoryPoint = {
  ts: number;        // 毫秒
  policyRate: number;
  qeMode: QeMode;
  qeMonthlyB: number;
};

export type FedStatement = {
  ts: number;
  text: string;
  stance: Stance;
  effects: {
    stocksPct: number;     // 预估对美股的瞬时影响 (%)
    dollarIdxPct: number;  // 美元指数 (%)
    approvalPct: number;   // 民意 (%)
  };
};

export type FedState = {
  policyRate: number;       // 联邦基金目标利率 (%) 0.00 ~ 10.00,步长 0.25
  qeMode: QeMode;
  qeMonthlyB: number;       // QE/QT 月度规模 (十亿美元)
  ts: number;
  history: FedHistoryPoint[];
  statements: FedStatement[];
};

export const FED_LS_KEY = 'presidentSim.fed.v1';
export const WATCHLIST_LS_KEY = 'presidentSim.marketWatchlist.v1';

export function defaultFedState(): FedState {
  const now = Date.now();
  // 生成最近 30 天的"默认"历史(都是当前利率,后续真实操作会覆盖)
  const history: FedHistoryPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    history.push({
      ts: now - i * 86400_000,
      policyRate: 4.50,
      qeMode: 'off',
      qeMonthlyB: 0,
    });
  }
  return {
    policyRate: 4.50,
    qeMode: 'off',
    qeMonthlyB: 0,
    ts: now,
    history,
    statements: [],
  };
}

// 鹰/鸽派关键词识别,用于推断 stance + 估算 effects
const HAWKISH = ['加息', '紧缩', '通胀', 'hawkish', 'tighten', 'raise', '抑制', '高于'];
const DOVISH  = ['降息', '宽松', '刺激', 'dovish', 'ease', 'cut', '增长', '支持就业'];

export function inferStance(text: string): Stance {
  const t = text.toLowerCase();
  let h = 0, d = 0;
  for (const w of HAWKISH) if (t.includes(w.toLowerCase())) h++;
  for (const w of DOVISH)  if (t.includes(w.toLowerCase())) d++;
  if (h > d) return 'hawkish';
  if (d > h) return 'dovish';
  return 'neutral';
}

export function estimateEffects(stance: Stance): FedStatement['effects'] {
  switch (stance) {
    case 'hawkish': return { stocksPct: -1.2, dollarIdxPct: +0.6, approvalPct: -0.3 };
    case 'dovish':  return { stocksPct: +1.5, dollarIdxPct: -0.7, approvalPct: +0.4 };
    default:        return { stocksPct: +0.1, dollarIdxPct: 0.0,  approvalPct: 0.0 };
  }
}

// 下次 FOMC 会议日(简化:取下一个月的第二个周三作为占位,真实可替换)
export function nextFomcDaysFromNow(now = new Date()): { date: string; daysAway: number } {
  const candidates: Date[] = [];
  for (let m = 0; m < 4; m++) {
    const probe = new Date(now.getFullYear(), now.getMonth() + m, 1);
    // 找该月第 2 个周三 (3)
    let count = 0;
    for (let d = 1; d <= 31; d++) {
      const day = new Date(probe.getFullYear(), probe.getMonth(), d);
      if (day.getMonth() !== probe.getMonth()) break;
      if (day.getDay() === 3) {
        count++;
        if (count === 2) { candidates.push(day); break; }
      }
    }
  }
  const futureDay = candidates.find((d) => d.getTime() > now.getTime()) ?? candidates[0];
  const daysAway = Math.max(0, Math.ceil((futureDay.getTime() - now.getTime()) / 86400_000));
  return { date: futureDay.toISOString().slice(0, 10), daysAway };
}
