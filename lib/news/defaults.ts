import type { NewsSource } from './types';

// 预置 12 个信息源（中外混合）。用户可在 UI 中启用/禁用/调权重/增删。
export const DEFAULT_NEWS_SOURCES: NewsSource[] = [
  { id: 'people-daily',  name: '人民日报',     category: '外交', url: 'http://www.people.com.cn/rss/politics.xml',          enabled: true,  weight: 7 },
  { id: 'xinhua',        name: '新华社',       category: '外交', url: 'http://www.xinhuanet.com/politics/news_politics.xml', enabled: true,  weight: 7 },
  { id: 'cnn-world',     name: 'CNN World',    category: '外交', url: 'http://rss.cnn.com/rss/edition_world.rss',           enabled: true,  weight: 6 },
  { id: 'bloomberg',     name: 'Bloomberg',    category: '经济', url: 'https://feeds.bloomberg.com/markets/news.rss',       enabled: true,  weight: 8 },
  { id: 'wsj-world',     name: 'WSJ World',    category: '经济', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',        enabled: true,  weight: 7 },
  { id: 'reuters-world', name: 'Reuters',      category: '外交', url: 'https://feeds.reuters.com/Reuters/worldNews',        enabled: true,  weight: 8 },
  { id: 'bbc-world',     name: 'BBC World',    category: '外交', url: 'http://feeds.bbci.co.uk/news/world/rss.xml',         enabled: true,  weight: 7 },
  { id: 'ap-top',        name: 'AP Top News',  category: '外交', url: 'https://feeds.apnews.com/rss/apf-topnews',           enabled: true,  weight: 6 },
  { id: 'usgs-quake',    name: 'USGS 地震',    category: '灾害', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson', enabled: true, weight: 5 },
  { id: 'hn-front',      name: 'Hacker News',  category: '科技', url: 'https://hacker-news.firebaseio.com/v0/topstories.json', enabled: true, weight: 4 },
  { id: 'arxiv-cs',      name: 'arXiv CS',     category: '科技', url: 'http://export.arxiv.org/rss/cs',                     enabled: false, weight: 3 },
  { id: 'guancha',       name: '观察者网',     category: '外交', url: 'https://www.guancha.cn/rss',                          enabled: false, weight: 5 },
];
