/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EAF4FF',
          100: '#D6E9FF',
          200: '#AED3FF',
          300: '#7FB8FF',
          400: '#4C9AFF',
          500: '#2379E0',
          600: '#1565C0',
          700: '#0D47A1',
          800: '#0A3A82',
          900: '#082E68',
        },
        surface: '#F7FAFF',
        ink: '#0F1B2D',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px rgba(21, 101, 192, 0.08)',
      },
    },
  },
  plugins: [],
};