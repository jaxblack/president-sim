'use client';

type Props = {
  size?: number;
  className?: string;
};

export default function Seal({ size = 44, className = '' }: Props) {
  return (
    <span
      className={`seal ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-label="presidential seal"
      role="img"
    >
      <svg viewBox="0 0 64 64" width={size * 0.7} height={size * 0.7} aria-hidden>
        <circle cx="32" cy="32" r="30" fill="#f5f1e8" stroke="#1c2331" strokeWidth="2" />
        <circle cx="32" cy="32" r="24" fill="none" stroke="#c9a961" strokeWidth="1.5" />
        {/* stylized eagle */}
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontSize="26"
          style={{ fontFamily: 'system-ui, "Apple Color Emoji", "Segoe UI Emoji"' }}
        >
          🦅
        </text>
        {/* stars */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const x = 32 + Math.cos(a) * 27;
          const y = 32 + Math.sin(a) * 27;
          return <circle key={i} cx={x} cy={y} r="1.2" fill="#c0392b" />;
        })}
      </svg>
    </span>
  );
}
