/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#F8F8F8',
        'bg-sidebar': '#3D3D3D',
        'text-primary': '#2C2C2C',
        'text-secondary': '#FFFFFF',
        'accent-blue': '#0A2463',
        'accent-gold': '#B89551',
        'accent-green': '#3A5A40',
        'border-light': '#E0E0E0',
        'bg-card': '#FFFFFF',
        'bg-table-even': '#FAFAFA',
        'bg-table-header': '#F0F0F0',
      },
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
        'playfair': ['Playfair Display', 'serif'],
      },
      fontSize: {
        'title': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'subtitle': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'default': '8px',
      }
    },
  },
  plugins: [],
};