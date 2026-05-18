/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#0a0b10',
          1: '#0f1117',
          2: '#141621',
          3: '#1a1d2b',
          4: '#222637',
        },
        line: {
          DEFAULT: '#262a3d',
          soft: '#1d2030',
          strong: '#363b54',
        },
        ink: {
          0: '#f5f6fa',
          1: '#c8ccdb',
          2: '#8a90a8',
          3: '#5e6378',
          4: '#3d4156',
        },
        accent: {
          violet: '#8b6cf6',
          violetSoft: '#6f54e0',
          blue: '#56a8ff',
          cyan: '#4cc9f0',
          green: '#4ade80',
          yellow: '#fbbf24',
          orange: '#fb923c',
          red: '#f87171',
          pink: '#f472b6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.02) inset, 0 0 0 1px rgba(255,255,255,0.02)',
        glow: '0 0 0 1px rgba(139,108,246,0.4), 0 8px 32px -12px rgba(139,108,246,0.5)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
    },
  },
  plugins: [],
};
