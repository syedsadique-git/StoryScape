/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D0D0F',
        card: '#151518',
        elevated: '#1C1C21',
        primary: '#7C3AED',
        'primary-hover': '#6D28D9',
        accent: '#A78BFA',
        muted: '#9CA3AF',
        white: '#F9FAFB',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [],
}
