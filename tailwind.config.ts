import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // existing
        brief: '#0a1929',
        accent: '#c9a961',
        // new "cartoon-professional / Oval Office" palette
        paper: '#f5f1e8',           // 羊皮纸底
        'paper-dark': '#e8e0cc',
        ink: '#1c2331',             // 深墨
        'stamp-red': '#c0392b',     // 印章红
        'oval-green': '#2c5f4f',    // 椭圆办公室绿
        alert: '#e67e22',           // 琥珀警示
        'priority-high': '#c0392b',
        'priority-med': '#e67e22',
        'priority-low': '#2c5f4f',
      },
      fontFamily: {
        display: ['"Bree Serif"', '"Fredoka"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        briefing: '0 4px 0 0 rgba(28,35,49,0.85), 0 8px 24px -8px rgba(28,35,49,0.35)',
        seal: '0 2px 0 0 rgba(28,35,49,0.7), 0 6px 16px -6px rgba(192,57,43,0.5)',
      },
      borderRadius: {
        briefing: '16px',
      },
    },
  },
  plugins: [],
};

export default config;
