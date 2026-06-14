/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--border)',
        ring: 'var(--border-hover)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        primary: {
          DEFAULT: 'var(--foreground)',
          foreground: 'var(--background)',
        },
        secondary: {
          DEFAULT: 'var(--surface-hover)',
          foreground: 'var(--foreground)',
        },
        destructive: {
          DEFAULT: 'var(--status-danger)',
          foreground: 'var(--foreground)',
        },
        muted: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--muted)',
        },
        accent: {
          DEFAULT: 'var(--surface-hover)',
          foreground: 'var(--foreground)',
        },
        popover: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--foreground)',
        },
        card: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--foreground)',
        },
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
