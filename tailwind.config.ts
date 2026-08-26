import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#080808',
        panel: '#111111',
        panel2: '#171717',
        line: '#282828',
        gold: {
          DEFAULT: '#D7B56D',
          bright: '#F0CF80',
          muted: '#9C8046',
          dark: '#6D5528'
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Arial', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'Arial', 'sans-serif']
      },
      boxShadow: {
        gold: '0 0 40px rgba(215, 181, 109, 0.13)',
        card: '0 12px 36px rgba(0, 0, 0, 0.24)'
      }
    }
  },
  plugins: []
};

export default config;
