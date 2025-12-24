/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        dark: {
          50: '#2a2a2a',
          100: '#262626',
          200: '#1f1f1f',
          300: '#1a1a1a',
          400: '#141414',
          500: '#0d0d0d',
        },
        // Accent green
        accent: {
          DEFAULT: '#00d26a',
          hover: '#00b85c',
          light: 'rgba(0, 210, 106, 0.1)',
        },
        // Yes/No outcome colors
        yes: {
          DEFAULT: '#00d26a',
          hover: '#00b85c',
          bg: 'rgba(0, 210, 106, 0.1)',
        },
        no: {
          DEFAULT: '#ff4757',
          hover: '#e84049',
          bg: 'rgba(255, 71, 87, 0.1)',
        },
        // Status colors
        status: {
          active: '#00d26a',
          'active-bg': 'rgba(0, 210, 106, 0.15)',
          ending: '#fbbf24',
          'ending-bg': 'rgba(251, 191, 36, 0.15)',
          resolved: '#3b82f6',
          'resolved-bg': 'rgba(59, 130, 246, 0.15)',
          live: '#ff4757',
          'live-bg': 'rgba(255, 71, 87, 0.15)',
        },
        // Text colors
        text: {
          primary: '#ffffff',
          secondary: '#a1a1a1',
          tertiary: '#6b6b6b',
          muted: '#4a4a4a',
        },
        // Border colors
        border: {
          DEFAULT: '#2a2a2a',
          secondary: '#3a3a3a',
          subtle: '#1f1f1f',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.5)',
        'input': '0 0 0 2px rgba(0, 210, 106, 0.3)',
      },
      keyframes: {
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        highlightMove: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 2px 6px rgba(255, 193, 7, 0.3)' },
          '50%': { transform: 'scale(1.02)', boxShadow: '0 4px 12px rgba(255, 193, 7, 0.5)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        slideDown: 'slideDown 0.3s ease-out',
        highlightMove: 'highlightMove 0.5s ease-out',
        fadeIn: 'fadeIn 0.2s ease-out',
        slideUp: 'slideUp 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

