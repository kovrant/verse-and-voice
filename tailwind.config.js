/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        /* Viewports with vertical room to spare — tablets in portrait. Layouts
           that spread out to fill the height key off this, so laptops and
           phones (which are never this tall) keep their compact arrangement. */
        tall: { raw: "(min-height: 1100px)" },
        /* Named because the raw `tall` screen switches off Tailwind's
           arbitrary min-[…] breakpoints. */
        xs: "400px",
        wide: "1360px",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
        },
        "brand-soft": "hsl(var(--brand-soft))",

        /* ── NextAdmin semantic tokens (teacher portal) ──
         * Same class names as NextAdmin Pro so its markup ports unchanged:
         * text-text-primary, bg-card-background, border-card-border, … Values
         * live in the admin blocks of globals.css. */
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          disable: "var(--text-disable)",
          50: "var(--text-50)",
          100: "var(--text-100)",
          200: "var(--text-200)",
        },
        "title-50": "var(--title-50)",
        icon: {
          primary: "var(--icon-primary)",
          secondary: "var(--icon-secondary)",
          tertiary: "var(--icon-tertiary)",
        },
        "background-gray": {
          primary: "var(--background-gray-primary)",
          secondary: "var(--background-gray-secondary)",
          secondary_alt: "var(--background-gray-secondary_alt)",
          secondary_alt_2: "var(--background-gray-secondary_alt_2)",
          tertiary: "var(--background-gray-tertiary)",
          quaternary: "var(--background-gray-quaternary)",
        },
        "background-white": {
          primary: "var(--background-white-primary)",
          secondary: "var(--background-white-secondary)",
        },
        "card-background": "var(--card-background)",
        "card-surface-area": "var(--card-surface-area)",
        "card-border": "var(--card-border)",
        "card-surface-border": "var(--card-surface-border)",
        "border-primary": "var(--border-primary)",
        "border-secondary": "var(--border-secondary)",
        "border-secondary-alt": "var(--border-secondary-alt)",
        base: {
          50: "var(--border-base-50)",
          100: "var(--border-base-100)",
          200: "var(--border-base-200)",
          300: "var(--border-base-300)",
        },
        "input-background": "var(--input-background)",
        "input-border": "var(--input-border)",
        "input-placeholder-text": "var(--input-placeholder-text-color)",
        "input-label-text": "var(--input-label-text-color)",
        "sidebar-navigation-nav-item-nav-hover-background":
          "var(--sidebar-navigation-nav-item-nav-hover-background)",
        "button-primary-outline": {
          background: "var(--button-primary-outline-background)",
          "hover-background": "var(--button-primary-outline-hover-background)",
          text: "var(--button-primary-outline-text)",
          stroke: "var(--button-primary-outline-stroke)",
        },
        "dropdowns-background": "var(--dropdowns-background)",
        "tooltip-background": "var(--tooltip-background)",
        "tooltip-text-color": "var(--tooltip-text-color)",
        "error-500": "var(--error-500)",
        "success-500": "var(--success-500)",
        "warning-500": "var(--warning-500)",
        "info-500": "var(--info-500)",

        /* ── Themed color scale overrides ──
         * These override Tailwind's built-in color names so that ALL existing
         * class references (e.g. bg-emerald-500/10, text-amber-400, from-teal-600)
         * automatically follow the current theme without any class name changes.
         * Shades with a `var(--x, <stock>)` fallback are only themed by the
         * student palette; admin doesn't define them and keeps stock Tailwind.
         */
        emerald: {
          200: "hsl(var(--c-p-200, 152 76% 80%) / <alpha-value>)",
          300: "hsl(var(--c-p-300) / <alpha-value>)",
          400: "hsl(var(--c-p-400) / <alpha-value>)",
          500: "hsl(var(--c-p-500) / <alpha-value>)",
          600: "hsl(var(--c-p-600) / <alpha-value>)",
          700: "hsl(var(--c-p-700, 163 94% 24%) / <alpha-value>)",
          800: "hsl(var(--c-p-800, 163 88% 20%) / <alpha-value>)",
          900: "hsl(var(--c-p-900) / <alpha-value>)",
        },
        teal: {
          300: "hsl(var(--c-s-300) / <alpha-value>)",
          400: "hsl(var(--c-s-400) / <alpha-value>)",
          500: "hsl(var(--c-s-500) / <alpha-value>)",
          600: "hsl(var(--c-s-600) / <alpha-value>)",
          700: "hsl(var(--c-s-700, 175 84% 26%) / <alpha-value>)",
          900: "hsl(var(--c-s-900) / <alpha-value>)",
        },
        amber: {
          200: "hsl(var(--c-a-200, 48 97% 77%) / <alpha-value>)",
          300: "hsl(var(--c-a-300) / <alpha-value>)",
          400: "hsl(var(--c-a-400) / <alpha-value>)",
          500: "hsl(var(--c-a-500) / <alpha-value>)",
          600: "hsl(var(--c-a-600) / <alpha-value>)",
          700: "hsl(var(--c-a-700, 26 90% 37%) / <alpha-value>)",
          800: "hsl(var(--c-a-800, 23 83% 31%) / <alpha-value>)",
        },
        yellow: {
          300: "hsl(var(--c-y-300) / <alpha-value>)",
          400: "hsl(var(--c-y-400) / <alpha-value>)",
          500: "hsl(var(--c-y-500, 45 93% 47%) / <alpha-value>)",
        },
        green: {
          400: "hsl(var(--c-g-400, 142 69% 58%) / <alpha-value>)",
          500: "hsl(var(--c-g-500, 142 71% 45%) / <alpha-value>)",
          600: "hsl(var(--c-g-600) / <alpha-value>)",
        },
        orange: {
          400: "hsl(var(--c-o-400, 27 96% 61%) / <alpha-value>)",
          500: "hsl(var(--c-o-500, 25 95% 53%) / <alpha-value>)",
          600: "hsl(var(--c-o-600) / <alpha-value>)",
        },
      },
      fontFamily: {
        /* --font-ui is Inter in the teacher portal only (see globals.css); the
           brand wordmark keeps Baloo 2 everywhere. */
        sans: ["var(--font-ui, var(--font-body))", "Nunito Sans", "system-ui", "sans-serif"],
        body: ["var(--font-ui, var(--font-body))", "Nunito Sans", "system-ui", "sans-serif"],
        heading: ["var(--font-ui, var(--font-heading))", "Baloo 2", "system-ui", "sans-serif"],
        display: ["var(--font-ui, var(--font-heading))", "Baloo 2", "system-ui", "sans-serif"],
        brand: ["var(--font-heading)", "Baloo 2", "system-ui", "sans-serif"],
        serif: ["var(--font-ui, var(--font-heading))", "Baloo 2", "system-ui", "sans-serif"],
        arabic: ["var(--font-scheherazade)", "var(--font-arabic)", "var(--font-naskh)", "'Traditional Arabic'", "serif"],
        hadith: ["var(--font-scheherazade)", "var(--font-arabic)", "var(--font-naskh)", "'Traditional Arabic'", "serif"],
        amiri: ["var(--font-scheherazade)", "var(--font-arabic)", "var(--font-naskh)", "'Traditional Arabic'", "serif"],
      },
      borderRadius: {
        lg: "var(--radius-card)" /* 16px — cards */,
        md: "var(--radius-button)" /* 12px — buttons */,
        sm: "var(--radius-input)" /* 10px — inputs */,
        xl: "calc(var(--radius-card) + 4px)",
        "2xl": "calc(var(--radius-card) + 8px)",
        button: "var(--radius-button)",
        card: "var(--radius-card)",
        input: "var(--radius-input)",
      },
      boxShadow: {
        soft: "0 4px 12px rgba(61, 64, 91, 0.08)",
        "soft-md": "0 6px 18px rgba(61, 64, 91, 0.09)",
        "soft-lg": "0 8px 24px rgba(61, 64, 91, 0.10)",
        xs: "var(--shadow-xs)",
        "3xl": "var(--shadow-3xl)",
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
  plugins: [
    require("tailwindcss-animate"),
    /* kid: — student-portal-only styles. Shared ui primitives default to the
       teacher (NextAdmin) look and use kid: to keep the student one; only on
       properties callers don't override, since kid: outranks a plain class. */
    ({ addVariant }) => addVariant("kid", '[data-portal="student"] &'),
  ],
}

module.exports = config
