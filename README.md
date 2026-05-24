# 总统模拟器 — President Sim

每日聚合一手最新最重要的全球情报,辅助国家级决策的网页应用。给你一个总统驾驶舱视角:今天世界上发生了什么大事?哪儿在打仗、哪儿在地震、科技圈在炒什么?

## Quickstart

```bash
git clone https://github.com/jaxblack/president-sim.git
cd president-sim
npm install
npm run dev
```

打开 <http://localhost:3030> 查看驾驶舱。

## 信息源(MVP)

聚合 4 个真实的开放 API/RSS,**无需任何 API key**:

| 源 | 类别 | 协议 |
| --- | --- | --- |
| BBC World | 外交 | RSS |
| Reuters World | 外交 | RSS |
| USGS 地震速报(过去一周显著事件) | 灾害 | GeoJSON |
| Hacker News 头条 | 科技 | Firebase REST |

按发布时间倒序展示,取每源最近 10 条 → 卡片墙最多 30 条。

## 路由

- `/` — 驾驶舱卡片墙(SSR,刷新即重新聚合)
- `/api/feed` — JSON 接口,返回 `{ items: FeedItem[] }`

## 技术栈

- Next.js 14.2.5(App Router · Node runtime)
- React 18.3.1
- Tailwind 3.4.6
- TypeScript 5.5.3
- rss-parser 3.13.0

## MVP 范围(明确不做的)

- ❌ 无认证 / 用户系统
- ❌ 无数据库 / 持久化
- ❌ 无决策提交、无历史回溯
- ❌ 无单元测试 / CI / Docker
- ❌ 无部署脚本(自行 Vercel/PM2)

下一步可加:更多源(CIA World Factbook、各国央行、市场数据、气象)、决策提交 + LLM 推演、按类别 tab、收藏、Slack/邮件推送。

## 许可

私有仓库,仅作 demo。
