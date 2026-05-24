import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: { extend: { colors: { brief: '#0a1929', accent: '#c9a961' } } },
  plugins: [],
};
export default config;
