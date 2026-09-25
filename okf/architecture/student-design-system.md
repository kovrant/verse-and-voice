---
type: architecture
title: "Student Portal Design System (Storybook Look)"
description: "The kid-facing visual language of /student/**: palette tokens, the kid-ui kit, the opt-in `kid` prop contract that keeps the teacher UI unchanged, and the flat-surface rule."
status: stable
verified: true
sources:
  - "src/app/globals.css"
  - "tailwind.config.js"
  - "src/components/kid-ui.tsx"
  - "src/components/student-nav.tsx"
  - "src/components/student-tab-bar.tsx"
  - "src/components/student-home-cards.tsx"
  - "src/components/synced-pdf-viewer.tsx"
tags:
  - design-system
  - portal
  - student
  - styling
  - tailwind
---

# Student Portal Design System (Storybook Look)

The student portal (`/student/**`) is designed for children, not for the adults who use the teacher dashboard. It has its own palette, its own component kit, and its own navigation model. See [Dual-Portal Routing and Confinement](dual-portal-routing.md) for how the two portals are kept apart at the routing and shell layer.

**Prime directive:** no student-portal styling change may alter a single pixel of the teacher dashboard. Everything below exists to make that mechanically enforceable.

---

## 🎨 Palette

Student tokens live in `[data-portal="student"]` and `[data-portal="student"].dark` in `src/app/globals.css`. The portal attribute is stamped on `<html>` before first paint, so Tailwind's `bg-card`, `text-primary` and friends resolve to different colours per portal with no per-component branching.

| Role | Token | Value | Use |
|---|---|---|---|
| Primary | `--primary` | `#2E3A2F` deep forest | Headings, body emphasis, solid CTAs |
| Secondary | `--secondary` | `#D9C9B2` sand | Quiet fills, icon tiles |
| Sage | `--sage` | `#6B7F5B` | Supporting green |
| **Accent** | `--accent` | `#C96F4F` terracotta | **Highlights only** — never a page background or a large surface |
| Background | `--background` | `#F8F6EE` cream | Page canvas |

### Crayon tokens (`--kid-*`)
Eight section colours, defined for student light **and** dark only. Each area of the portal owns one, and its home card, tab, page header and inner panels all share it:

| Token | Section | Token | Section |
|---|---|---|---|
| `--kid-sage` | Quran | `--kid-coral` | Quizzes |
| `--kid-sky` | Class | `--kid-saffron` | Trophies |
| `--kid-lavender` | Memorize | `--kid-teal` | Stories |
| `--kid-caramel` | Hadiths | `--kid-rose` | Namaz |

The `KidColor` union in `src/components/student-nav.tsx` is the single list of legal names. Components take a `color: KidColor` and set `--kid` from it (`kidVar()` in `kid-ui.tsx`), so one CSS variable drives border, tint and ring on a card.

> **Pitfall:** a crayon class built by string concatenation at runtime (`` `bg-[hsl(var(--kid-${color}))]` ``) is invisible to the Tailwind scanner and silently renders nothing. Set `--kid` via a `style` object and reference `hsl(var(--kid) / …)` in a static class instead.

---

## 🧱 Surfaces are flat

Student surfaces use a **soft drop shadow and nothing else**. The earlier storybook design stacked a hard offset "lip" (`box-shadow: 0 Npx 0 <tint>`) under every card, button and pill, paired with an `active:translate-y-[3px]` press. Students disliked it and it was removed across the portal.

| Do | Don't |
|---|---|
| `shadow-soft` / `shadow-soft-md` / `shadow-soft-lg` | `shadow-[0_5px_0_hsl(var(--kid)/0.55)]` |
| `active:scale-[0.99]` for press feedback | `active:translate-y-[3px] active:shadow-none` |
| `hover:-translate-y-0.5` for a light lift | `hover:shadow-[0_7px_0_…]` |

The three `soft*` values are defined once under `theme.extend.boxShadow` in `tailwind.config.js`. Depth is not what makes the portal feel like a kids' app — the crayon colour, the `rounded-[20px]`–`rounded-[32px]` radii, the `1.5px` borders, the mascot and the emoji do that.

---

## 🧰 The kit: `src/components/kid-ui.tsx`

Student pages compose these rather than hand-rolling classes, so a future look change is one file:

| Export | Purpose |
|---|---|
| `KidButton` | The big friendly button; `primary` is the terracotta→saffron pill |
| `KidCard` | Standard surface; with `color` it takes a crayon tint and border |
| `KidModal` | Radix Dialog popup with a colour band for a `hero` (mascot, medal) |
| `KidPageHeader` | Emoji + title + subtitle + optional `right` slot |
| `KidStat`, `KidTabs`, `KidEmpty` | Stat tile, pill tabs, empty state |
| `QuranBookIcon`, `QaidaLettersIcon` | Inline SVGs used instead of emoji where an emoji would be wrong (`🔤` renders as the Latin letters "abc", which is inappropriate in an Islamic lesson) |

`KidModal` renders `extra` inside the portal but **outside** the card, because `position: fixed` inside a transformed ancestor is clipped to that ancestor (see Invariants).

---

## 🔀 The `kid` prop contract (shared components)

Some components serve both portals. They take an **optional `kid?: boolean`, defaulting to `false`**, and branch their classNames on it. Teacher pages never pass it, so their markup is unchanged by construction.

```tsx
// src/components/synced-pdf-viewer.tsx — the reference implementation
const iconBtn = kid
  ? "… rounded-full hover:bg-[hsl(var(--kid-sage)/0.3)] …"   // student
  : "… rounded-md hover:bg-muted …"                          // teacher, untouched
```

Components currently on this contract:

`synced-pdf-viewer.tsx` · `notifications-view.tsx` · `trophy-case.tsx` · `memorization-chunks.tsx` · `namaz-step-card.tsx` · `notification-bell.tsx` · `fee-display.tsx`

**Rule for any portal-wide restyle:** a sweep over these files must only touch lines inside a `kid` branch. Verify each hit individually — a regex over the whole file will reach teacher markup. Purely teacher-side files (`src/components/sidebar.tsx`, `src/app/media/page.tsx`, `teacher-*.tsx`) are out of scope for student styling work.

---

## 🧭 Navigation: cards, not a sidebar

The portal has **no sidebar**. Children navigate by recognition, not by reading a 14-item list:

* **Home** (`src/components/student-home-cards.tsx`) is a grid of big crayon cards, one per section, each with its emoji and a progress ring.
* **Tab bar** (`src/components/student-tab-bar.tsx`) is always visible; the active tab gets a stronger tile plus a ring and a dot. Every tab is tile + label — the shapes must stay consistent between active and inactive.
* **Top bar** (`src/components/student-topbar.tsx`) carries the logo, the streak pill, the notification bell, the day/night switch and the avatar menu.
* **Shared nav state** lives in `src/components/student-nav.tsx`: `ME_PATHS`, `isPathActive`, `useHasNamaz`, `useIsQaida`, and `readDestination` — which resolves the single "Read" destination to Qaida or Quran depending on the student's active round.
* The **mascot** (`student-mascot.tsx`, a crescent moon "Hilal") reacts to context via `useMascotMood` (`awake | sleepy | excited`).
* Feedback is `kidToast()` from `src/lib/kid-toast.ts`, not the raw toast library — it applies the crayon fill, border and heading font.

---

## ⚠️ Invariants and known traps

1. **`contain` / `transform` / `filter` create a containing block.** Any of these on an ancestor makes a descendant's `position: fixed` pin to that ancestor instead of the viewport. This is what made the Quran reader's backdrop cover only half the screen — the fix was removing `contain: layout style` from `<main>`.
2. **Page-wrapper animations must use `animation-fill-mode: backwards`, not `forwards`.** `forwards` holds the final transform after the animation ends, which keeps a containing block alive and leaves dead space below the fold. `.animate-fade-in-up` in `globals.css` is `backwards` for exactly this reason.
3. **Never restyle the Quran/Qaida PDF rendering.** The mushaf page itself is off limits; only the chrome around it (`synced-pdf-viewer`'s pills and buttons) takes the `kid` treatment. See [Live Interactive Class](../domain/live-class-session.md).
4. **Dark mode contrast.** `text-muted-foreground` is unreadable inside a tinted crayon panel; use `text-foreground/85` there.
5. **A global `button:focus-visible` rule outranks `outline-none`.** `KidButton` therefore sets an explicit `focus-visible:[outline:3px_solid_hsl(var(--kid-coral)/0.55)]`.
6. **Fonts are self-hosted; never add a CDN `@import` or `<link>`.** All five faces live in `src/app/fonts/` and are registered with `next/font/local` in `src/app/layout.tsx`: Baloo 2 (`--font-heading`), Nunito Sans (`--font-body`), Scheherazade New (`--font-scheherazade`), Noto Naskh Arabic (`--font-naskh`) and Amiri (`--font-arabic`). Every `variable` class must be on `<body>` or the stack silently falls through to `serif`.
7. **Arabic stacks reference the variables, not family names.** `next/font` mangles the family to a hashed name (`__scheherazade_a9f61e`), so a bare `'Scheherazade New'` in a stack matches nothing. The one stack, used by `font-arabic` / `font-hadith` / `font-amiri` in `tailwind.config.js` and the matching utility in `globals.css`, is:
   ```
   var(--font-scheherazade), var(--font-arabic), var(--font-naskh), 'Traditional Arabic', serif
   ```
   Scheherazade New and Noto Naskh Arabic ship the **Arabic subset only** (400/600/700), so Latin characters fall through to Amiri, which carries both scripts.
8. **The sukun must render as the Indo-Pak jazm (`cv78` = 2).** Our students read an Indo-Pak mushaf, where jazm is an open hook; the Uthmani convention every font defaults to draws a small circle. A student reported the Namaz Arabic as unreadable for exactly this reason. The `.font-arabic` / `.font-hadith` / `.font-amiri` utility therefore sets:
   ```css
   font-feature-settings: "cv78" 2, "calt" 1, "liga" 1;
   ```
   Two consequences:
   * **Scheherazade New must be SIL's own build, not the Google Fonts build.** Google strips the character variants entirely, which is why the `"cv01", "cv02"` that sat here previously did nothing at all. The files in `src/app/fonts/` are subset from the official OFL release with `pyftsubset --layout-features="*"`; dropping that flag silently removes `cv78`. `SCHEHERAZADE-OFL.txt` ships alongside them as the licence requires.
   * **Never "fix" this in the data.** The text stays `U+0652` everywhere (273 occurrences across the Namaz and Hadith seeds and `src/lib/tajweed/rules.ts`). `U+06E1` would render the same hook but makes the stored text non-standard and unportable. This is a presentation concern, so it belongs in the font, where one line covers every occurrence including anything a teacher pastes in later.
