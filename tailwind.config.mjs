/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  safelist: [
    'from-dark/90', 'via-primary/40', 'to-accent/60',
    'from-primary/80', 'via-dark/60',
    'from-accent/80', 'via-dark/70', 'to-dark/85',
    'from-dark/85', 'via-dark/65', 'to-primary/60',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#003060',
        accent: '#962e20',
        light: '#ffffff',
        dark: '#012141',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
