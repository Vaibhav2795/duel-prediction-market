/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        highlightMove: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 2px 6px rgba(255, 193, 7, 0.3)' },
          '50%': { transform: 'scale(1.02)', boxShadow: '0 4px 12px rgba(255, 193, 7, 0.5)' },
        },
      },
      animation: {
        slideDown: 'slideDown 0.3s ease-out',
        highlightMove: 'highlightMove 0.5s ease-out',
      },
    },
  },
  plugins: [],
}

