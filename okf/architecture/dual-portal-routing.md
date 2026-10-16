---
type: architecture
title: "Dual-Portal Routing and Confinement"
description: "Isolation model separating the Teacher Dashboard and Student Portal within a single Next.js App Router tree."
status: stable
verified: true
sources:
  - "src/middleware.ts"
  - "src/app/layout.tsx"
  - "src/components/app-shell.tsx"
  - "src/app/globals.css"
tags:
  - routing
  - middleware
  - security
  - portal
---

# Dual-Portal Routing and Confinement

Quran Academy hosts two distinct user-facing applications inside a single Next.js 14 App Router project:
1. **Teacher Administrative Dashboard:** Rooted at `/teacher/**`, managing students, analytics, fees, curriculum, and live teaching.
2. **Student Learning Portal:** Rooted at `/student/**`, providing live class attendance, Mushaf reading, Namaz tracking, and assignments.

In front of both sits the **public website** at `/` (see [Public Welcome Page](public-welcome-page.md)).

---

## 🚪 Entry Points and Path Confinement

| User Role | Login URL | Default Home | Confined Routes | Entry Visibility |
|---|---|---|---|---|
| **Visitor** | — | `/` (website) | `/`, `/welcome`, `/login`, `/teacher/login` | The bare domain |
| **Student** | `/login` | `/student` | `/student/**` only | Kids login button on the website |
| **Teacher** | `/teacher/login` (`/admin` redirects there) | `/teacher` | `/teacher/**` | Not linked from the website; reached by typing it |

### Confinement Rules in Middleware (`src/middleware.ts`)
The edge middleware enforces strict separation:
* **Legacy addresses:** `/admin` → `/teacher/login`; the old root dashboard paths (`/students/123`, `/class`, `/fees` …) → the same path under `/teacher`, query intact. Covers bookmarks and links stored in old notifications.
* **Front door:** `/` is rewritten to `/welcome` for everyone except a signed-in student, who goes to `/student`.
* **Unauthenticated traffic:** `/teacher/**` redirects to `/teacher/login?redirectTo=<target>`; everything else to `/login?redirectTo=<target>`. (API routes `/api/**` are explicitly exempted to prevent body-dropping on HTTP 307 redirects).
* **Students attempting teacher routes:** Immediately redirected to `/student`.
* **Teachers attempting student routes:** Immediately redirected to `/teacher` (teachers must not roam inside the student portal).
* **Already authenticated on login pages:** Visiting `/login` or `/teacher/login` redirects students to `/student` and teachers to `/teacher`.
* **`teacherPostLoginPath`** only returns paths inside `/teacher/**` (never the login page itself); everything else falls back to `/teacher`.

---

## ⚡ Edge Middleware Performance & Auth Strategy

```typescript
// src/middleware.ts
const { data: { session } } = await supabase.auth.getSession()
const user = session?.user ?? null
```

* **`getSession()` vs `getUser()`:**
  * Middleware uses `supabase.auth.getSession()` which reads the local JWT from HTTP cookies without an external network round-trip.
  * *Operational Decision:* `supabase.auth.getUser()` was previously used and triggered `MIDDLEWARE_INVOCATION_TIMEOUT` (504 errors on Vercel) during high-concurrency live classes when Supabase Auth was under load.
  * Real cryptographic verification is deferred to Supabase Row Level Security (RLS) on client queries and `requireTeacher()` in API routes.

---

## 🎨 Dual Theming & Layout Architecture

The visual identity switches completely between portals:
* **Portal Data Attribute:** `<html data-portal="admin|student">` is stamped before first paint via an inline script in `src/app/layout.tsx`.
* **CSS Palettes:** `src/app/globals.css` defines distinct CSS variable tokens for admin vs student (including dark mode variants).
* **Fonts:** All five faces self-hosted under `src/app/fonts/` and registered with `next/font/local` in `src/app/layout.tsx`. **Never import Google Fonts via external CDNs.** See [Student Portal Design System](student-design-system.md) for the Arabic stack.
* **Shell Switching (`src/components/app-shell.tsx`):**
  * Toggles distinct navigation depending on whether the route starts with `/student`: the teacher keeps a sidebar (`src/components/sidebar.tsx`); the student portal has **no sidebar** and uses a card-first home plus an always-visible tab bar.
  * Wraps the student portal inside `LiveClassProvider` to listen for teacher presence.
* **Student visual language:** see [Student Portal Design System](student-design-system.md) for the crayon tokens, the `kid-ui` kit and the `kid` prop contract that keeps shared components teacher-safe.
