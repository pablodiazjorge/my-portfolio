import type { Config } from 'tailwindcss';
module.exports = {
  content: ['./src/**/*.{html,ts,css,scss}'],
  theme: {
    extend: {
      colors: {
        'teal-300': '#5eead4',
      },
    },
  },
  plugins: [],
} satisfies Config;
