import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        so: {
          bg:       'var(--so-bg)',
          surface:  'var(--so-surface)',
          card:     'var(--so-card)',
          border:   'var(--so-border)',
          muted:    'var(--so-muted)',
          subtle:   'var(--so-subtle)',
          text:     'var(--so-text)',
          textMid:  'var(--so-textMid)',
          red:      '#82181a',
          redBright:'#e40014',
          redLight: '#ff6568',
          ash:      '#746572',
          ashLight: '#9d8a9b',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Josefin Sans"', 'Inter', 'sans-serif'],
        serif:   ['"Playfair Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        logo:  '0.3em',
        wide2: '0.15em',
      },
    },
  },
  plugins: [],
}

export default config
