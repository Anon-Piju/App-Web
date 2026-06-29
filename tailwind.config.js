/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: {
          50:  '#0f0f11',
          100: '#18181c',
          200: '#222228',
          300: '#2e2e36',
          400: '#3a3a45',
        },
        accent: {
          DEFAULT: '#7c6af7',
          dim:     '#4f45a0',
          bright:  '#a99cf9',
        },
        jade:   '#3ecf8e',
        amber:  '#f4a94e',
        rose:   '#f16b6b',
        sky:    '#5aafee',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
