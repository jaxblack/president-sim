import './globals.css';
import Link from 'next/link';
import Seal from './components/Seal';

export const metadata = {
  title: '总统模拟器 — PDB',
  description: '总统每日简报 · President\'s Daily Brief',
};

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function briefingNo() {
  // 简报序号:基于年内第几天
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = (d.getTime() - start.getTime()) / 86400000;
  return `№ ${d.getFullYear()}-${String(Math.floor(diff)).padStart(3, '0')}`;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bree+Serif&family=Fredoka:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="border-b-2 border-ink bg-paper-dark/60 backdrop-blur px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center gap-4 flex-wrap">
            <Seal size={56} />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl text-ink leading-none">
                总统模拟器
                <span className="text-stamp-red"> · </span>
                <span className="text-ink/80">Daily Brief</span>
              </h1>
              <p className="text-[11px] tracking-widest uppercase text-ink/60 mt-1">
                Office of the President · Situation Room
              </p>
            </div>
            <nav className="flex items-center gap-1 text-sm font-display">
              <Link href="/"          className="px-3 py-1.5 rounded-md hover:bg-paper border border-transparent hover:border-ink/30 text-ink">简报</Link>
              <Link href="/portfolio" className="px-3 py-1.5 rounded-md hover:bg-paper border border-transparent hover:border-ink/30 text-ink">资产</Link>
              <Link href="/market"    className="px-3 py-1.5 rounded-md hover:bg-paper border border-transparent hover:border-ink/30 text-ink">市场</Link>
              <Link href="/fed"       className="px-3 py-1.5 rounded-md hover:bg-paper border border-transparent hover:border-ink/30 text-ink">美联储</Link>
              <Link href="/schedule"  className="px-3 py-1.5 rounded-md hover:bg-paper border border-transparent hover:border-ink/30 text-ink">日程</Link>
            </nav>
            <div className="text-right">
              <div className="font-mono text-sm text-ink">{todayStr()}</div>
              {/* 仿邮戳序号 */}
              <svg width="120" height="32" viewBox="0 0 120 32" className="mt-1">
                <rect
                  x="2"
                  y="2"
                  width="116"
                  height="28"
                  rx="4"
                  fill="none"
                  stroke="#c0392b"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <text
                  x="60"
                  y="21"
                  textAnchor="middle"
                  fontFamily="'Bree Serif', Georgia, serif"
                  fontSize="13"
                  fill="#c0392b"
                  letterSpacing="2"
                >
                  {briefingNo()}
                </text>
              </svg>
            </div>
          </div>
        </header>

        <main className="px-6 py-6 max-w-6xl mx-auto">{children}</main>

        <footer className="border-t-2 border-dashed border-ink/40 mt-12 px-6 py-4">
          <p className="max-w-6xl mx-auto text-[11px] tracking-widest uppercase text-ink/60 text-center">
            🦅 CLASSIFIED · FOR PRESIDENT&apos;S EYES ONLY ·
            <span className="text-ink/50 normal-case tracking-normal ml-2">
              此处所有信息均来自公开源,仅供模拟
            </span>
          </p>
        </footer>
      </body>
    </html>
  );
}
