/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Premium Dark/Light palette
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae2fd',
          300: '#7ccbfd',
          400: '#38b2fb',
          500: '#0ea0ea',
          600: '#027fc1',
          700: '#03659c',
          800: '#075681',
          900: '#0c486c',
          950: '#082e49',
        },
      },
    },
  },
  plugins: [],
}
