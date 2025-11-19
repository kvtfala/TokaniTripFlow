import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem", /* 9px */
        md: ".375rem", /* 6px */
        sm: ".1875rem", /* 3px */
      },
      colors: {
        // Pacific/Fiji Business Theme Colors
        ocean: {
          DEFAULT: '#00547A',
          50: '#E1F4FA',
          100: '#C3E9F5',
          200: '#80CFE3',
          300: '#4DB8D6',
          400: '#1AA1C9',
          500: '#009BAA',
          600: '#007B8A',
          700: '#006677',
          800: '#004D5A',
          900: '#003344',
        },
        coral: {
          DEFAULT: '#EF6C57',
          50: '#FFF5F3',
          100: '#FFD0C7',
          200: '#FFB5A6',
          300: '#FF9A85',
          400: '#FF8F70',
          500: '#EF6C57',
          600: '#DB5842',
          700: '#B33120',
          800: '#8F2719',
          900: '#6B1D13',
        },
        sand: {
          DEFAULT: '#F4E4C1',
          50: '#FCFAF5',
          100: '#FAE7BF',
          200: '#F9DFA8',
          300: '#F7D791',
          400: '#F6CF7A',
          500: '#F4E4C1',
          600: '#E5D5B2',
          700: '#CCB060',
          800: '#B39A52',
          900: '#8C7840',
        },
        lagoon: {
          DEFAULT: '#009BAA',
          50: '#E6F9FB',
          100: '#B3F0F4',
          200: '#80E7ED',
          300: '#4DDEE6',
          400: '#1AD5DF',
          500: '#009BAA',
          600: '#008897',
          700: '#007777',
          800: '#006060',
          900: '#004949',
        },
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
        // Tokani TripFlow Brand Colors (ttf-*)
        'ttf-blue': "hsl(var(--ttf-blue) / <alpha-value>)",
        'ttf-navy': "hsl(var(--ttf-navy) / <alpha-value>)",
        'ttf-aqua': "hsl(var(--ttf-aqua) / <alpha-value>)",
        'ttf-light-sky': "hsl(var(--ttf-light-sky) / <alpha-value>)",
        'ttf-red': "hsl(var(--ttf-red) / <alpha-value>)",
        // Semantic colors
        'ttf-success': "hsl(var(--success) / <alpha-value>)",
        'ttf-error': "hsl(var(--destructive) / <alpha-value>)",
        'ttf-warning': "hsl(var(--warning) / <alpha-value>)",
        // Grey scale
        'ttf-grey-900': "hsl(var(--foreground) / <alpha-value>)",
        'ttf-grey-700': "hsl(var(--muted-foreground) / <alpha-value>)",
        'ttf-grey-500': "hsl(var(--muted-foreground) / 0.7)",
        'ttf-gray-300': "hsl(var(--border) / <alpha-value>)",
        'ttf-gray-100': "hsl(var(--card-border) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        'ttf-h1': 'var(--text-h1)',
        'ttf-h2': 'var(--text-h2)',
        'ttf-h3': 'var(--text-h3)',
        'ttf-section': 'var(--text-section)',
        'ttf-body': 'var(--text-body)',
        'ttf-sm': 'var(--text-sm)',
        'ttf-xs': 'var(--text-xs)',
      },
      spacing: {
        'ttf-1': 'var(--space-1)',
        'ttf-2': 'var(--space-2)',
        'ttf-3': 'var(--space-3)',
        'ttf-4': 'var(--space-4)',
        'ttf-5': 'var(--space-5)',
        'ttf-6': 'var(--space-6)',
        'ttf-8': 'var(--space-8)',
        'ttf-10': 'var(--space-10)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
