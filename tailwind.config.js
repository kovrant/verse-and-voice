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

        /* ── Themed color scale overrides ──
         * These override Tailwind's built-in color names so that ALL existing
         * class references (e.g. bg-emerald-500/10, text-amber-400, from-teal-600)
         * automatically follow the current theme without any class name changes.
         */
        emerald: {
          300: "hsl(var(--c-p-300) / <alpha-value>)",
          400: "hsl(var(--c-p-400) / <alpha-value>)",
          500: "hsl(var(--c-p-500) / <alpha-value>)",
          600: "hsl(var(--c-p-600) / <alpha-value>)",
          900: "hsl(var(--c-p-900) / <alpha-value>)",
        },
        teal: {
          300: "hsl(var(--c-s-300) / <alpha-value>)",
          400: "hsl(var(--c-s-400) / <alpha-value>)",
          500: "hsl(var(--c-s-500) / <alpha-value>)",
          600: "hsl(var(--c-s-600) / <alpha-value>)",
          900: "hsl(var(--c-s-900) / <alpha-value>)",
        },
        amber: {
          300: "hsl(var(--c-a-300) / <alpha-value>)",
          400: "hsl(var(--c-a-400) / <alpha-value>)",
          500: "hsl(var(--c-a-500) / <alpha-value>)",
          600: "hsl(var(--c-a-600) / <alpha-value>)",
        },
        yellow: {
          300: "hsl(var(--c-y-300) / <alpha-value>)",
          400: "hsl(var(--c-y-400) / <alpha-value>)",
        },
        green: {
          600: "hsl(var(--c-g-600) / <alpha-value>)",
        },
        orange: {
          600: "hsl(var(--c-o-600) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "Nunito", "system-ui", "sans-serif"],
        display: ["var(--font-reem-kufi)", "Reem Kufi", "system-ui", "sans-serif"],
        heading: ["var(--font-reem-kufi)", "Reem Kufi", "system-ui", "sans-serif"],
        brand: ["var(--font-reem-kufi)", "Reem Kufi", "system-ui", "sans-serif"],
        arabic: ["var(--font-amiri-quran)", "Amiri Quran", "Amiri", "serif"],
      },
      borderRadius: {
        lg: "var(--radius-card)",       /* 16px — cards */
        md: "var(--radius-button)",     /* 12px — buttons */
        sm: "var(--radius-input)",      /* 10px — inputs */
        xl: "calc(var(--radius-card) + 4px)",
        "2xl": "calc(var(--radius-card) + 8px)",
        button: "var(--radius-button)",
        card: "var(--radius-card)",
        input: "var(--radius-input)",
      },
      boxShadow: {
        soft: "0 4px 12px rgba(61, 64, 91, 0.08)",
        "soft-lg": "0 8px 24px rgba(61, 64, 91, 0.10)",
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
  plugins: [require("tailwindcss-animate")],
}

module.exports = config
