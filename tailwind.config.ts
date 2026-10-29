import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Egyptian Luxury & Warm Blush Palette (docs/BRAND_IDENTITY.md + PROJECT.md)
          primary: '#D4A5A5',        // Dusty Rose (Main brand accent, active state)
          'primary-dark': '#B57E7E', // Muted Rose (Hover state, borders)
          secondary: '#F7EDE2',      // Warm Champagne (Soft background panels, badges)
          accent: '#D4AF37',         // Champagne Gold (Promotional badges, discount tags)
          surface: '#FAF7F2',        // Linen White (Page background)
          'text-primary': '#2B2D42', // Deep Charcoal (Headers, primary typography)
          'text-secondary': '#6C757D',// Muted Slate (Descriptions, metadata)
          burgundy: '#800020',       // Egyptian Luxury Burgundy
          wine: '#5B0017',           // Deep Wine
          rose: '#E8B4B8',           // Soft Rose
          blush: '#F4DCD6',          // Pale Blush
          sand: '#FDFBF7',           // Sand Canvas
          cream: '#F4EFEA',          // Cream Surface
          gold: '#D4AF37',           // Gold Metallic
          success: '#2A9D8F',        // In-stock badge, order completed
          danger: '#E76F51',         // Out-of-stock badge, form error
        },
      },
      fontFamily: {
        sans: ['Inter', 'Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Cormorant Garamond', 'Cinzel', 'serif'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
