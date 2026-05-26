// Shared types for the news / orders module.
// 严格模块边界:此目录与 app/news, app/orders, app/api/news, app/api/orders 共用。

export type NewsCategory = '外交' | '灾害' | '科技' | '经济' | '其他';

export type NewsSource = {
  id: string;
  name: string;
  category: NewsCategory | string;
  url?: string;
  enabled: boolean;
  weight: number; // 0-10
};

export type NewsNote = {
  newsId: string;
  note: string;
  ts: string; // ISO timestamp
};

export type EffectKey = 'approval' | 'economy' | 'diplomacy' | 'security';

export type OrderEffect = { key: EffectKey; delta: number };

export type OrderStatus = '草案' | '已发布' | '撤回';

export type ExecutiveOrder = {
  id: string;
  ts: string;
  title: string;
  body: string;
  sourceNewsId?: string;
  effects: OrderEffect[];
  status: OrderStatus;
};

export type GovState = {
  approval: number;
  economy: number;
  diplomacy: number;
  security: number;
};

export const EFFECT_LABELS: Record<EffectKey, string> = {
  approval: '民意支持',
  economy: '经济活力',
  diplomacy: '外交关系',
  security: '安全指数',
};
