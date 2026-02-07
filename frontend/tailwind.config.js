/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a4bcfc',
          400: '#7c99f8',
          500: '#5a73f2',
          600: '#4354e6',
          700: '#3843d3',
          800: '#3039ab',
          900: '#2d3687',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981',
          600: '#059669',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#f43f5e',
          600: '#e11d48',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'elevated': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '18px',
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  }
}