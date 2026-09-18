/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d8f1ff',
          200: '#b9e7ff',
          300: '#89d9ff',
          400: '#51c2ff',
          500: '#29a4ff',
          600: '#1285ff',
          700: '#0b6eff',
          800: '#0f58cc',
          900: '#134b9f',
        },
      },
    },
  },
  plugins: [],
}
