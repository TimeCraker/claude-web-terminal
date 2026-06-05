/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors via CSS variables
        'theme-bg': 'var(--theme-bg)',
        'theme-surface': 'var(--theme-surface)',
        'theme-surface-light': 'var(--theme-surface-light)',
        'theme-surface-elevated': 'var(--theme-surface-elevated)',
        'theme-border': 'var(--theme-border)',
        'theme-border-strong': 'var(--theme-border-strong)',
        'theme-text': 'var(--theme-text)',
        'theme-text-secondary': 'var(--theme-text-secondary)',
        'theme-text-muted': 'var(--theme-text-muted)',
        'theme-accent': 'var(--theme-accent-primary)',
        'theme-accent-secondary': 'var(--theme-accent-secondary)',
        'theme-success': 'var(--theme-success)',
        'theme-warning': 'var(--theme-warning)',
        'theme-error': 'var(--theme-error)',
      },
      fontFamily: {
        mono: ['var(--theme-font-mono)', 'monospace'],
        ui: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'theme-glow': '0 0 15px var(--theme-glow-primary)',
        'theme-glow-secondary': '0 0 15px var(--theme-glow-secondary)',
        // Keep legacy names for backward compatibility
        'warp-glow': '0 0 15px var(--theme-glow-primary)',
        'warp-glow-purple': '0 0 15px var(--theme-glow-secondary)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
