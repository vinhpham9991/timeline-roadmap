/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 16px 40px rgba(2, 6, 23, 0.45)',
      },
      colors: {
        canvas: '#070b16',
        panel: '#0f172a',
      },
    },
  },
  plugins: [],
};
