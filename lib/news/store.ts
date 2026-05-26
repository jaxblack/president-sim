'use client';

import { useEffect, useState, useCallback } from 'react';
import type { NewsSource, NewsNote, ExecutiveOrder, GovState } from './types';
import { DEFAULT_NEWS_SOURCES } from './defaults';

const KEY_SOURCES = 'presidentSim.newsSources.v1';
const KEY_NOTES   = 'presidentSim.newsNotes.v1';
const KEY_ORDERS  = 'presidentSim.executiveOrders.v1';
const KEY_GOV     = 'presidentSim.govState.v1';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, val: T) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function useNewsSources() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setSources(read<NewsSource[]>(KEY_SOURCES, DEFAULT_NEWS_SOURCES));
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) write(KEY_SOURCES, sources); }, [sources, hydrated]);

  const toggle = useCallback((id: string) => {
    setSources((arr) => arr.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }, []);
  const setWeight = useCallback((id: string, w: number) => {
    setSources((arr) => arr.map((s) => (s.id === id ? { ...s, weight: w } : s)));
  }, []);
  const add = useCallback((s: NewsSource) => setSources((arr) => [...arr, s]), []);
  const remove = useCallback((id: string) => setSources((arr) => arr.filter((s) => s.id !== id)), []);
  const update = useCallback((id: string, patch: Partial<NewsSource>) => {
    setSources((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);
  const reset = useCallback(() => setSources(DEFAULT_NEWS_SOURCES), []);

  return { sources, hydrated, toggle, setWeight, add, remove, update, reset };
}

export function useNewsNotes() {
  const [notes, setNotes] = useState<NewsNote[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setNotes(read<NewsNote[]>(KEY_NOTES, [])); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) write(KEY_NOTES, notes); }, [notes, hydrated]);

  const upsert = useCallback((newsId: string, note: string) => {
    setNotes((arr) => {
      const trimmed = note.trim();
      const others = arr.filter((n) => n.newsId !== newsId);
      if (!trimmed) return others;
      return [...others, { newsId, note: trimmed, ts: new Date().toISOString() }];
    });
  }, []);
  const remove = useCallback((newsId: string) => {
    setNotes((arr) => arr.filter((n) => n.newsId !== newsId));
  }, []);
  const get = useCallback((newsId: string) => notes.find((n) => n.newsId === newsId), [notes]);

  return { notes, hydrated, upsert, remove, get };
}

const DEFAULT_GOV: GovState = { approval: 50, economy: 50, diplomacy: 50, security: 50 };

export function useGovState() {
  const [state, setState] = useState<GovState>(DEFAULT_GOV);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setState(read<GovState>(KEY_GOV, DEFAULT_GOV)); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) write(KEY_GOV, state); }, [state, hydrated]);

  const apply = useCallback((effects: { key: keyof GovState; delta: number }[]) => {
    setState((s) => {
      const next = { ...s };
      for (const e of effects) {
        const v = next[e.key] + e.delta;
        next[e.key] = Math.max(0, Math.min(100, v));
      }
      return next;
    });
  }, []);
  const reverse = useCallback((effects: { key: keyof GovState; delta: number }[]) => {
    apply(effects.map((e) => ({ key: e.key, delta: -e.delta })));
  }, [apply]);
  const reset = useCallback(() => setState(DEFAULT_GOV), []);

  return { state, hydrated, apply, reverse, reset };
}

export function useExecutiveOrders() {
  const [orders, setOrders] = useState<ExecutiveOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setOrders(read<ExecutiveOrder[]>(KEY_ORDERS, [])); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) write(KEY_ORDERS, orders); }, [orders, hydrated]);

  const create = useCallback((o: ExecutiveOrder) => setOrders((arr) => [o, ...arr]), []);
  const update = useCallback((id: string, patch: Partial<ExecutiveOrder>) => {
    setOrders((arr) => arr.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);
  const remove = useCallback((id: string) => setOrders((arr) => arr.filter((o) => o.id !== id)), []);

  return { orders, hydrated, create, update, remove };
}

export { KEY_SOURCES, KEY_NOTES, KEY_ORDERS, KEY_GOV };
