---
type: architecture
title: "Public Welcome Page (/welcome)"
description: "The marketing landing page: a 1:1 port of the approved Claude Design mock, ten chapters from dawn to night, rendered with the self-hosted fonts outside the app shell, reachable without signing in."
status: stable
verified: true
sources:
  - "src/app/welcome/page.tsx"
  - "src/components/welcome/welcome-story.tsx"
  - "src/components/welcome/welcome-data.ts"
  - "src/middleware.ts"
  - "src/components/app-shell.tsx"
  - "src/components/theme-provider.tsx"
  - "src/app/layout.tsx"
tags:
  - landing
  - marketing
  - portal
  - student
  - styling
---

# Public Welcome Page (`/welcome`)

The only page a visitor can see without an account. It tells one child's journey from the first Arabic letter to a khatm as ten scrolling chapters, with the sky turning from cream dawn to starry night. It exists to book free-trial classes; the root path stays the teacher dashboard and `/login` stays the student entry.

**Source of truth for the look is the approved Claude Design mock** (`Verse and Voice.dc.html`, owner's download). The page is a 1:1 port of that mock's markup, inline styles, colours, copy and runtime behaviour. The only deliberate substitutions are the fonts: the mock's Google-hosted Baloo 2 / Nunito Sans / Scheherazade New become the app's self-hosted `--font-heading` / `--font-body` / Arabic stack, with the Indo-Pak jazm feature setting the portal uses everywhere. Styles are inline on purpose so the component reads like the mock it was ported from.

---

## 🧭 Routing and shell

| Concern | Where | Rule |
|---|---|---|
| Front door | `src/middleware.ts` | A request to `/` is **rewritten** (not redirected) to `/welcome` for everyone except a signed-in student, who is sent to `/student`. The teacher dashboard lives at `/teacher`, so the bare domain is the website for teachers too. |
| Public access | `src/middleware.ts` `PUBLIC_PATHS` | `/welcome` is listed too, so the page is also reachable directly (handy for previewing while signed in as the teacher). |
| Shell and palette | `src/components/app-shell.tsx`, `src/components/theme-provider.tsx` | Both read `useSelectedLayoutSegment()` and treat the segment `welcome` as the landing page: no shell, student palette. The segment follows the **rendered route**, so it is right on a full load of `/` and after a client-side navigation to `/` (e.g. the login page's "Back to website" link). Never key this off the pathname: it is `/` there, and the root layout is kept across client navigations. |
| Palette stamp | `src/components/theme-provider.tsx` `portalForPath` and the first-paint script in `src/app/layout.tsx` | Both stamp `data-portal="student"` for `/welcome`. The page uses fixed hex colours, so this only matters for the brief pre-hydration body background. Keep the two lists in sync. |
| Shell | `src/components/app-shell.tsx` | Returns children directly for `/welcome`: no sidebar, top bar, tab bar, backdrop or padding. The page draws its own sky, nav and mascot. |
| Body background | `welcome-story.tsx` `CSS` string | Sets `html{background:var(--sky)}` and `body{background:transparent!important}` while mounted, because the global `bg-background` on `<body>` would otherwise hide the scroll-driven sky. |

---

## 📖 Structure

`src/components/welcome/welcome-story.tsx` owns the page; `welcome-data.ts` holds copy, posture paths, scenes, the mock calendar and the deterministic star/doodle scatter.

Chapters are `<section id="chN" data-chapter>`, all `max-width:1180px` rounded cards except 1 (hero) and 10 (night):

| # | id | Tint | Content |
|---|---|---|---|
| 1 | `ch1` | cream | Hero: age-group headline, Alif that draws itself (`vvDraw`), talking logo |
| 2 | `ch2` | sage 18% | Letters fly in and settle on a baseline; "Baa" play card (SpeechSynthesis) |
| 3 | `ch3` | sky 18% | Teacher / You phones, highlight bar steps through Al-Fatiha (`vvLines`) |
| 4 | `ch4` | sage 32% | Progress ring + 30 stones in the eight crayon tints, filled by scroll, "Khatm!" star burst |
| 5 | `ch5` | white | Al-Ikhlas chunks drop in; hadith card flips on hover/tap |
| 6 | `ch6` | rose 18% | Three cards, Learn / Repeat / Pray, with arrows between (`PrayMoves`); no step list, no Arabic |
| 7 | `ch7` | saffron 22% | Medal drop, streak counts to 30, badges scale in, certificate, confetti spray |
| 8 | `ch8` | teal 22% | Book covers swing open; three scenes of Prophet Yunus with a moral compass |
| 9 | `ch9` | sand 55% | Three parent quotes and a parent-app phone mock |
| 10 | `ch10` | night | Trial-request form, thank-you state, footer |

---

## 🌗 Dawn to night (the `tick`)

One rAF-throttled scroll handler mirrors the mock's runtime:

* Interpolates `SKY` stops between `#ch7` and `#ch10` and writes `--sky`, `--ink`, `--bar`, `--barline`, `--navline`, `--navoff`, `--stars` on `<html>` (removed on unmount).
* Picks the active chapter (last section whose top is above 45% of the viewport; the last one once scrolled to the bottom) → side dots, Hilal's bubble and mood.
* Fills the stones from the `[data-stones]` box's position and updates the ring, counter and one-shot star burst imperatively.
* Rotates Hilal gently with scroll; drives the mobile progress line.

Reveals use `data-reveal` / `data-from` / `data-to` / `data-trigger` attributes read by one `IntersectionObserver` (threshold .18); `data-trigger` fires the streak count, medal drop and confetti. Under `prefers-reduced-motion` everything renders in its final state.

---

## 🧩 Behaviour

* **Age toggle** (`AGES`): little / young / teens swaps the hero headline and Hilal's dawn mood. It sits in the top bar on wide screens and in the hero on phones.
* **Breakpoints are CSS, never `innerWidth`.** The page's `CSS` string carries them: labels shorten below 1120px; below 760px the top bar is one slim row (icon login, short CTA, no toggle), the side dots hide and the progress line shows; below 480px the wordmark text hides too. Inline styles that a breakpoint must override are overridden with `!important` in that block.

* **Age toggle** swaps only the hero headline and Hilal's dawn mood (`little` excited, `young` awake, `teens` wink). Labels shorten below 1120px; the top bar wraps to three rows below 760px.
* **Hilal** bubble shows for 5.5s on load and 3.5s after each chapter change.
* **Form** confirms locally and sends nothing (`// ponytail` in the submit handler). `WHATSAPP_URL` in `welcome-data.ts` is empty, so the WhatsApp line keeps the mock's `#` link.
* **Placeholders to replace before launch:** the three named parent quotes, "Awarded to Yusuf", the Privacy and Contact footer links, and the enquiry destination.

---

## ⚠️ Invariants

1. Adding a public page means adding it to **both** `portalForPath` and the layout's first-paint script.
2. `color-mix()` is used for every tint; it needs Chrome 111+, Safari 16.2+, Firefox 113+. Older browsers see white cards, not broken ones.
3. The runtime writes `style.background` / `transform` / `opacity` directly on stones and reveal targets. React leaves those alone because the JSX `style` values never change between renders; do not animate those properties through React state as well.
4. Arabic text sets the stack and `font-feature-settings` inline (`ar()` helper), never a bare family name. See [Student Portal Design System](student-design-system.md).
