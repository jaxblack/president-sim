import './globals.css';

export const metadata = {
  title: '总统模拟器 — PDB',
  description: '总统每日简报 · President\'s Daily Brief',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <header className="border-b border-slate-800 px-6 py-4">
          <h1 className="text-xl font-bold text-accent">
            总统模拟器 <span className="text-xs text-slate-400 ml-2">President's Daily Brief</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            每日聚合一手最新最重要的全球情报,辅助国家级决策
          </p>
        </header>
        <main className="px-6 py-6 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
