import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Silva Ortiz dark palette
        so: {
          bg:       '#0b0b0b',
          surface:  '#161616',
          card:     '#1b1b1b',
          border:   '#2a2a2a',
          muted:    '#484848',
          subtle:   '#636363',
          text:     '#f8f8f8',
          textMid:  '#9e9e9e',
          red:      '#82181a',
          redBright:'#e40014',
          redLight: '#ff6568',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Josefin Sans"', 'Inter', 'sans-serif'],
        serif:   ['"Playfair Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        logo: '0.3em',
        wide2: '0.15em',
      },
    },
  },
  plugins: [],
}

export default config
