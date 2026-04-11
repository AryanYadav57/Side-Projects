/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        loom: {
          bg: {
            primary: '#0A0A0F',
            panel: '#13131A',
            card: '#1C1C26',
          },
          accent: {
            blue: '#4A9EFF',
            purple: '#9B6FFF',
            amber: '#FFB347',
            green: '#4DFFB4',
          },
          text: {
            primary: '#F0F0FF',
            muted: '#6B6B8A',
          },
          edge: {
            default: '#2A2A3A',
            active: 'rgba(74, 158, 255, 0.25)',
          },
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
