/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta exacta del demo Castor_Dashboard_Demo6.html (genera bg-brand-bg, text-brand-gold-light, border-brand-border, …)
        brand: {
          bg: '#0A1628',
          'bg-2': '#0F1F33',
          panel: '#152943',
          'panel-2': '#1C3558',
          'panel-3': '#23426C',
          navy: '#1F3A5F',
          'navy-light': '#2F5585',
          gold: '#C9A961',
          'gold-dark': '#A88D4B',
          'gold-light': '#E6D7A8',
          'gold-glow': '#D4B876',
          cream: '#F3F0E8',
          muted: '#8A9BB8',
          border: '#2A4061',
        },
        // Alias retro-compatibles con el MVP existente (no chocan con brand.*)
        'panel-bg': '#152943',
        'gold-accent': '#C9A961',
        muted: '#8A9BB8',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};
