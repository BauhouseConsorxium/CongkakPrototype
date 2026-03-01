/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        'surface-1': '#1A1A1A',
        'surface-2': '#333333',
        text: '#F0EDE8',
        dim: '#4A4A4A',
        c1: '#FF4444',
        c2: '#B8A080',
        c3: '#00FF88',
        c4: '#00DD77',
        c5: '#6B5040',
        c6: '#8B7355',
        c7: '#7D6548',
        c8: '#00CC66',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
