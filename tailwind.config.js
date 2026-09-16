/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Almarai', 'system-ui', 'sans-serif'],
        almarai: ['Almarai', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.875rem', { lineHeight: '1.5' }],
        'sm': ['1rem', { lineHeight: '1.55' }],
        'base': ['1.125rem', { lineHeight: '1.65' }],
        'lg': ['1.25rem', { lineHeight: '1.65' }],
        'xl': ['1.5rem', { lineHeight: '1.55' }],
        '2xl': ['1.75rem', { lineHeight: '1.45' }],
        '3xl': ['2.125rem', { lineHeight: '1.35' }],
      },
    },
  },
  plugins: [],
}