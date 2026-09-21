/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff4ed',
          100: '#ffe6d4',
          200: '#ffc8a8',
          300: '#ffa070',
          400: '#ff7c42',
          500: '#FF6B35',
          600: '#e55a2b',
          700: '#cc4a22',
          800: '#b33d1c',
          900: '#99331a',
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
