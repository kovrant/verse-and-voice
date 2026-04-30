export type ThemeKey = "madinahGarden" | "heritage"

export interface ThemeConfig {
  name: string
  description: string
  preview: [string, string] // [primary hsl, accent hsl] for swatch
  colors: Record<string, string>
}

export const themes: Record<ThemeKey, ThemeConfig> = {
  // ── Madinah Garden: emerald, sage, manuscript gold on parchment ──
  madinahGarden: {
    name: "Madinah Garden",
    description: "Emerald, sage & manuscript gold",
    preview: ["175 77% 26%", "31 50% 64%"],
    colors: {
      "--background": "40 50% 95%",
      "--foreground": "220 18% 17%",
      "--card": "0 0% 100%",
      "--card-foreground": "220 18% 17%",
      "--surface-alt": "38 42% 92%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "220 18% 17%",
      "--secondary": "159 38% 75%",
      "--secondary-foreground": "175 77% 18%",
      "--muted": "38 42% 92%",
      "--muted-foreground": "173 22% 46%",
      "--destructive": "15 50% 58%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "40 38% 84%",
      "--border-strong": "38 36% 75%",
      "--input": "40 38% 84%",
      "--radius": "1rem",

      "--primary": "175 77% 26%",
      "--primary-hover": "176 79% 20%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "175 77% 26%",
      "--accent": "31 50% 64%",
      "--accent-soft": "36 53% 80%",
      "--accent-foreground": "220 18% 17%",
      "--gold": "31 50% 64%",
      "--gold-foreground": "220 18% 17%",

      "--success": "142 76% 36%",
      "--warning": "31 50% 64%",
      "--error": "15 50% 58%",

      "--c-p-300": "173 45% 55%",
      "--c-p-400": "174 60% 38%",
      "--c-p-500": "175 77% 26%",
      "--c-p-600": "176 79% 20%",
      "--c-p-900": "175 80% 12%",
      "--c-s-300": "159 40% 85%",
      "--c-s-400": "159 38% 80%",
      "--c-s-500": "159 38% 75%",
      "--c-s-600": "159 32% 60%",
      "--c-s-900": "159 38% 30%",
      "--c-a-300": "36 53% 80%",
      "--c-a-400": "33 50% 72%",
      "--c-a-500": "31 50% 64%",
      "--c-a-600": "28 50% 50%",
      "--c-y-300": "36 53% 80%",
      "--c-y-400": "33 50% 72%",
      "--c-g-600": "142 76% 36%",
      "--c-o-600": "15 50% 58%",
      "--c-p-rgb": "15 118 110",
      "--c-p-light-rgb": "167 215 197",
      "--c-a-rgb": "212 165 116",
      "--c-p-bg-glow": "159 38% 85%",
      "--c-a-bg-glow": "36 53% 88%",
    },
  },

  // ── Heritage: navy text, sage + mustard + terracotta accents ──
  // Palette: #2D3C59 navy · #94A378 sage · #E5BA41 mustard · #D1855C terracotta
  heritage: {
    name: "Heritage",
    description: "Earthy & elegant",
    preview: ["21 56% 59%", "44 76% 58%"],
    colors: {
      "--background": "40 35% 93%",
      "--foreground": "219 33% 22%",
      "--card": "42 50% 96%",
      "--card-foreground": "219 33% 22%",
      "--popover": "42 50% 96%",
      "--popover-foreground": "219 33% 22%",
      "--secondary": "78 28% 88%",
      "--secondary-foreground": "219 30% 28%",
      "--muted": "40 25% 90%",
      "--muted-foreground": "219 18% 42%",
      "--destructive": "358 70% 58%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "35 22% 82%",
      "--input": "35 22% 82%",
      "--radius": "1rem",

      "--primary": "21 56% 59%",
      "--primary-foreground": "0 0% 100%",
      "--ring": "21 56% 59%",
      "--accent": "44 76% 58%",
      "--accent-foreground": "219 35% 18%",
      "--gold": "44 76% 58%",
      "--gold-foreground": "219 35% 18%",

      // Primary scale (terracotta — #D1855C)
      "--c-p-300": "22 65% 78%",
      "--c-p-400": "21 60% 68%",
      "--c-p-500": "21 56% 59%",
      "--c-p-600": "19 55% 48%",
      "--c-p-900": "18 45% 24%",
      // Secondary scale (sage — #94A378)
      "--c-s-300": "82 26% 78%",
      "--c-s-400": "81 22% 66%",
      "--c-s-500": "81 19% 55%",
      "--c-s-600": "80 22% 42%",
      "--c-s-900": "80 25% 22%",
      // Accent scale (mustard — #E5BA41)
      "--c-a-300": "46 88% 78%",
      "--c-a-400": "45 82% 68%",
      "--c-a-500": "44 76% 58%",
      "--c-a-600": "40 78% 48%",
      "--c-y-300": "48 92% 78%",
      "--c-y-400": "46 88% 68%",
      "--c-g-600": "21 55% 48%",
      "--c-o-600": "30 70% 55%",
      "--c-p-rgb": "209 133 92",
      "--c-p-light-rgb": "225 168 130",
      "--c-a-rgb": "229 186 65",
      "--c-p-bg-glow": "82 35% 82%",
      "--c-a-bg-glow": "44 70% 86%",
    },
  },
}

export const themeKeys = Object.keys(themes) as ThemeKey[]
export const DEFAULT_THEME: ThemeKey = "madinahGarden"
