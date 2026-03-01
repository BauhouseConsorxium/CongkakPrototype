/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#141020',
        'surface-1': '#1e1830',
        'surface-2': '#2a2240',
        text: '#f0eaf8',
        dim: '#6a5f7a',
        c1: '#ff3377',
        c2: '#ff9922',
        c3: '#33ddff',
        c4: '#77ff44',
        c5: '#aa44ff',
        c6: '#ff6633',
        c7: '#ffdd22',
        c8: '#44ffaa',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
