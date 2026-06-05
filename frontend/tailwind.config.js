/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'warp-bg': '#1C1D22',
        'warp-surface': '#16171B',
        'warp-surface-light': '#25262C',
        'warp-border': '#2C2E35',
        'warp-text': '#E4E6EB',
        'warp-text-secondary': '#9CA3AF',
        'warp-accent-blue': '#53D8FB',
        'warp-accent-purple': '#9D4EDD',
        'warp-accent-green': '#A8E6CF',
        'warp-accent-red': '#FF6B6B',
        'warp-accent-yellow': '#FFD3B6',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'warp-glow': '0 0 15px rgba(83, 216, 251, 0.15)',
        'warp-glow-purple': '0 0 15px rgba(157, 78, 221, 0.15)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
