'use client';

import { useState } from 'react';
import { useNewsNotes } from '@/lib/news/store';

export default function NoteEditor({ newsId, title }: { newsId: string; title?: string }) {
  const { get, upsert, remove, hydrated } = useNewsNotes();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  if (!hydrated) return null;
  const existing = get(newsId);

  const onSave = () => {
    upsert(newsId, draft);
    setDraft('');
    setOpen(false);
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) setDraft(existing?.note ?? ''); }}
        className="text-[11px] text-ink/70 hover:text-stamp-red"
        title={title}
      >
        📝 {existing ? '编辑注释' : '注释'}
        {existing && <span className="ml-1 text-ink/50">·</span>}
        {existing && (
          <span className="ml-1 text-ink/60 italic line-clamp-1 max-w-[200px] inline-block align-bottom">
            {existing.note.slice(0, 60)}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <textarea
            className="w-full bg-paper-dark/40 border border-ink/30 rounded p-2 text-sm"
            rows={3}
            placeholder="写下你的总统批注…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="text-xs font-semibold text-stamp-red border border-stamp-red rounded px-3 py-1 hover:bg-stamp-red hover:text-white"
            >
              保存
            </button>
            {existing && (
              <button
                onClick={() => { remove(newsId); setOpen(false); }}
                className="text-xs text-ink/60 hover:underline"
              >
                删除
              </button>
            )}
            <button onClick={() => setOpen(false)} className="text-xs text-ink/60 hover:underline">
              取消
            </button>
          </div>
          {existing && (
            <p className="text-[10px] text-ink/50 font-mono">
              最近编辑 {existing.ts.slice(0, 16).replace('T', ' ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
