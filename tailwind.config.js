/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'arcade-yellow': '#FFD000',
        'arcade-red': '#E62429',
        'arcade-orange': '#FF6A00',
        'arcade-dark': '#0B0E14',
        'arcade-panel': '#151922',
        'arcade-border': '#2A3040',
        'arcade-green': '#00E676',
      },
      fontFamily: {
        arcade: ['"Press Start 2P"', 'monospace', 'sans-serif'],
      },
      boxShadow: {
        'arcade-glow': '0 0 15px rgba(255, 208, 0, 0.4)',
        'arcade-screen': 'inset 0 0 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 230, 118, 0.2)',
      },
    },
  },
  plugins: [],
}
