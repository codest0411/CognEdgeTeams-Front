/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          600: '#5b63ff',
          700: '#4b52e6',
          800: '#353dbd',
        }
      }
    },
  },
  plugins: [],
}
