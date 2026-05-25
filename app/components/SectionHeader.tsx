'use client';

import Seal from './Seal';

type Props = {
  title: string;
  subtitle?: string;
  count?: number;
  icon?: string; // emoji override inside seal area
};

export default function SectionHeader({ title, subtitle, count, icon }: Props) {
  return (
    <div className="section-header">
      <span
        className="seal seal-lg"
        aria-hidden
        style={{ background: '#f5f1e8' }}
      >
        <span style={{ fontSize: 28 }}>{icon ?? '🦅'}</span>
      </span>
      <div className="flex-1">
        <h2 className="font-display text-2xl text-ink leading-none">{title}</h2>
        {subtitle && (
          <p className="text-xs text-ink/60 mt-1 tracking-wide uppercase">{subtitle}</p>
        )}
      </div>
      {typeof count === 'number' && (
        <span className="source-chip">{count} 条</span>
      )}
      <span className="rule" />
      <span className="stamp">CLASSIFIED</span>
    </div>
  );
}
