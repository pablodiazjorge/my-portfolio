import type { Config } from 'tailwindcss';
module.exports = {
  content: ['./src/**/*.{html,ts,css,scss}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0f172a',
          light: '#ffffff',
        },
        text: {
          DEFAULT: '#94a3b8',
          light: '#1e293b',
        },
        accent: {
          DEFAULT: '#5eead4',
          light: '#2563eb',
        },
        'hover-bg': {
          DEFAULT: '#1e293b',
          light: '#e2e8f0',
        },
        'hover-text': {
          DEFAULT: '#e2e8f0',
          light: '#1e293b',
        },
        'accent-hover': {
          DEFAULT: 'rgba(148, 163, 184, 0.1)',
          light: 'rgba(85, 147, 233, 0.72)',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
