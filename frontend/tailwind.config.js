/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0d1b2a',
          800: '#112236',
          700: '#162c44',
        },
        purple: {
          brand: '#7b2d8b',
        },
        pink: {
          brand: '#e91e8c',
        },
      },
    },
  },
  plugins: [],
}
