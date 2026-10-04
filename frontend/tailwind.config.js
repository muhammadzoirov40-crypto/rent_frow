/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'soft-md': '0 4px 16px -4px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 12px 30px -8px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 25px -4px rgb(var(--accent-rgb) / 0.35)',
        'glow-lg': '0 0 40px -6px rgb(var(--accent-rgb) / 0.45)',
      },
      colors: {
        brand: {
          // Theme-color aware: driven by --accent* tokens (Original = RentHub orange)
          50: 'rgb(var(--accent-rgb) / 0.05)',
          100: 'rgb(var(--accent-rgb) / 0.1)',
          200: 'rgb(var(--accent-rgb) / 0.2)',
          300: 'rgb(var(--accent-rgb) / 0.3)',
          400: 'var(--accent-light)',
          500: 'var(--accent)',
          600: 'var(--accent-hover)',
          700: 'var(--accent-dark)',
          800: 'var(--accent-dark)',
          900: 'var(--accent-dark)',
        },
        navy: {
          50: '#e8e8ec',
          100: '#c5c5cf',
          200: '#9e9eb0',
          300: '#777791',
          400: '#595979',
          500: '#3c3c61',
          600: '#2d2d4f',
          700: '#24243e',
          800: '#1A1A2E',
          900: '#111120',
        },
      },
    },
  },
  plugins: [],
}
