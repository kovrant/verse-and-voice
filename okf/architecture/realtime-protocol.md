---
type: architecture
title: "Realtime Channel Protocol"
description: "Supabase Realtime topology, presence tracking, broadcast events, and normalized scroll synchronization."
status: stable
verified: true
sources:
  - "src/lib/use-class-channel.ts"
  - "src/lib/use-online-students.ts"
  - "src/lib/scroll-sync.ts"
  - "supabase/migration_realtime_class_auth.sql"
tags:
  - realtime
  - presence
  - broadcast
  - live-class
---

# Realtime Channel Protocol

Live classes in Quran Academy use **Supabase Realtime** directly between teacher and student clients with zero database writes during the interactive session.

---

## 📡 Channel Topology

There are two primary channel categories:

### 1. Class Session Channel: `class:<studentId>`
* Owned by `src/lib/use-class-channel.ts`.
* Dedicated private topic per active student.
* **Presence:** Tracks who is connected (`teacher` vs `student`) and current location state.
* **Broadcast Events:**
  * `nav`: Carries `{ para: number, page: number }`. (Note: Qaida uses `para = 0`).
  * `scroll`: Carries normalized scroll position `{ ratio: number }` (0.0 to 1.0).
  * `pointer`: Transmits `{ x: number, y: number, active: boolean }` coordinates for live Mushaf pointer/highlighter.
  * `end`: Signal from teacher ending the live session.

### 2. Global Student Online Channel: `students:online`
* Owned by `src/lib/use-online-students.ts`.
* Drives the green "online" indicator in the teacher's dashboard student list.
* Carries force-signout broadcast events if a student's session is invalidated by the teacher.

---

## 🔄 Critical Channel Invariants

1. **Single Instance Rule:**  
   `supabase-js` shares channel instances by topic string. Adding more than one `useClassChannel` instance on the same topic within the same client causes event echo loops and duplicate listeners.
   * Student side: Enforced globally in `LiveClassProvider`.
   * Teacher side: Enforced in `src/app/class/live-session.tsx`.
2. **Presence Toggling without Re-subscribing:**  
   The `present` flag toggles presence tracking on the *existing* channel connection. A student can listen for the "teacher is live" status without leaving and rejoining the channel.
3. **Private Channel Auth (`NEXT_PUBLIC_REALTIME_PRIVATE`):**  
   When set to `"true"`, `supabase.realtime.setAuth()` must be called **before** `channel.subscribe()`. Failing to do so causes the Supabase Realtime server to silently drop the subscription.

---

## 📜 Scroll Synchronization: Ratio vs Pixels

Students and teachers have different display viewports, resolutions, and zoom settings.

> [!IMPORTANT]
> **Never sync raw pixel values (`scrollTop`).**  
> We sync a normalized **0..1 ratio** calculated via `ratioFromScrollTop()` (`src/lib/scroll-sync.ts`).  
> Sub-pixel noise is filtered with `SCROLL_SYNC_EPS = 0.012` to prevent infinite scroll ping-pong between connected clients.
