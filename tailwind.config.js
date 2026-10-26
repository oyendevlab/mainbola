/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#080D1A',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        pitch: {
          light: '#2D8A4E',
          dark: '#247541',
          line: '#A7F3D0',
        },
        emerald: {
          accent: '#10B981',
          glow: '#34D399',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
