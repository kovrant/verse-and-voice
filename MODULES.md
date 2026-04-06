# Quran Academy — Completed Modules

> Last updated: April 6, 2026

---

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Storage)
- **UI**: Tailwind CSS + shadcn/ui (dark Islamic theme)
- **Language**: TypeScript
- **Auth**: None (private local tool)

---

## 1. Core Layout & Theme

| Feature | Status | Files |
|---------|--------|-------|
| Dark Islamic theme (navy + gold + emerald) | Done | `globals.css`, `tailwind.config.js` |
| Islamic geometric SVG patterns | Done | `globals.css` |
| Responsive sidebar with mobile toggle | Done | `sidebar.tsx` |
| Sidebar nav: Dashboard, Students, Class, Memorization, Fees | Done | `sidebar.tsx` |
| Shimmer skeleton loading states | Done | All pages |
| Fade-in animations on page load | Done | All pages |
| Custom dark scrollbar | Done | `globals.css` |
| Hidden number input spinners | Done | `globals.css` |

---

## 2. Students Module (`/students`)

| Feature | Status | Files |
|---------|--------|-------|
| Student list with table view | Done | `students/page.tsx` |
| Search by name, guardian, country | Done | `students/page.tsx` |
| Status filter tabs (Reading / Completed / Left Uncompleted / All) | Done | `students/page.tsx` |
| Default filter: Reading only | Done | `students/page.tsx` |
| Column visibility settings (gear icon, persisted to localStorage) | Done | `students/page.tsx` |
| Sortable column headers (click to sort asc/desc/clear) | Done | `students/page.tsx` |
| Sort state persisted to localStorage | Done | `students/page.tsx` |
| Filter state persisted to localStorage | Done | `students/page.tsx` |
| Pagination with page size selector (10/20/50) | Done | `students/page.tsx` |
| Add Student form (`/students/new`) | Done | `students/new/page.tsx` |
| Student detail page (`/students/[id]`) | Done | `students/[id]/page.tsx` |
| Edit student dialog (all fields) | Done | `students/[id]/page.tsx` |
| Student avatar initials | Done | All student views |

### Student Fields
| Field | Type | Notes |
|-------|------|-------|
| Name | text | Required |
| Guardian Name | text | Required |
| Country | select | Dropdown: Pakistan, UK, US, Saudi Arabia, Bahrain, UAE, Canada, Australia, Other |
| Admission Date | date | Required |
| Monthly Fee | number | Required |
| Currency | select | GBP (default), USD, PKR, SAR, BHD |
| Class Time | time picker | Custom scroll-wheel picker with hour/minute/AM-PM |
| Status | select | Reading / Completed / Left Uncompleted |
| End Date | date | Shown only when status is Completed or Left Uncompleted |
| Quran Progress | toggle + fields | See Quran Progress module below |

---

## 3. Quran Progress Module

| Feature | Status | Files |
|---------|--------|-------|
| Norani Qaida / Reading Quran toggle | Done | Add form, Edit dialog |
| Paras from End (30 down) tracking | Done | `desc_completed` field |
| Currently on Para (ascending) tracking | Done | `asc_completed` field |
| Auto-computed: current para, total completed, percentage | Done | `quran-progress.tsx` |
| Progress bar with glow effect | Done | `progress.tsx` |
| Three display variants: compact (table), card (detail), full (class) | Done | `quran-progress.tsx` |
| Norani Qaida badge display | Done | `quran-progress.tsx` |
| Completed (30/30) badge | Done | `quran-progress.tsx` |

### Progress Logic
- `desc_completed` = paras done from 30 going down (e.g., 5 = did 30, 29, 28, 27, 26)
- `asc_completed` = the para they are currently ON (e.g., 20)
- Completed = `desc + (asc - 1)` = `5 + 19 = 24`
- Display: `Para 20 (24/30)`

---

## 4. Memorization Module (`/memorization`)

| Feature | Status | Files |
|---------|--------|-------|
| Shared catalog of memorization items | Done | `memorization/page.tsx` |
| Categories: Surah, Dua, Namaz, General | Done | `memorization/page.tsx` |
| Color-coded category badges | Done | `memorization/page.tsx` |
| Add item with title + category + optional image | Done | `memorization/page.tsx` |
| Image upload to Supabase Storage (free tier) | Done | `memorization/page.tsx` |
| Image preview modal (full size) | Done | `memorization/page.tsx` |
| Change / remove image on existing items | Done | `memorization/page.tsx` |
| Search + category filter tabs | Done | `memorization/page.tsx` |
| Student count per item | Done | `memorization/page.tsx` |
| Delete with confirmation (if assigned) | Done | `memorization/page.tsx` |
| Assign items to students from catalog | Done | `students/[id]/page.tsx` |
| Per-student status: memorizing / memorized | Done | `students/[id]/page.tsx` |
| Mark Done / Undo / Unassign actions | Done | `students/[id]/page.tsx` |
| Mark Revised with timestamp | Done | `students/[id]/page.tsx` |
| Thumbnails in student detail + class session | Done | Multiple files |

### Seeded Catalog Items (15)
Namaz, Ayat al-Kursi, Surah Fatiha, Surah Ikhlas, Surah Falaq, Surah Nas, Surah Kausar, Surah Lahab, Surah Nasr, Dua before eating, Dua after eating, Dua before sleeping, Dua after waking up, Dua entering masjid, Six Kalimas

---

## 5. Class Session Module (`/class`)

| Feature | Status | Files |
|---------|--------|-------|
| Student dropdown selector (active students only) | Done | `class/page.tsx` |
| Class card with Islamic pattern header | Done | `class/page.tsx` |
| Class time (large, prominent) | Done | `class/page.tsx` |
| Quran progress (full variant with bar) | Done | `class/page.tsx` |
| Days since enrollment | Done | `class/page.tsx` |
| Currently memorizing items (from catalog) | Done | `class/page.tsx` |
| Memorized items (compact badges) | Done | `class/page.tsx` |
| Weekly revision picker (picks least recently revised) | Done | `class/page.tsx` |
| Mark Revised + Pick Another buttons | Done | `class/page.tsx` |
| Image thumbnails on memorization items | Done | `class/page.tsx` |

---

## 6. Fee Management Module (`/fees`)

| Feature | Status | Files |
|---------|--------|-------|
| Month/Year selector | Done | `fees/page.tsx` |
| Auto-create fee records for active students | Done | `fees/page.tsx` |
| Summary cards: Payment Status, Total Collected, Total Pending | Done | `fees/page.tsx` |
| Sortable table (Student, Fee, Status, Paid Date) | Done | `fees/page.tsx` |
| Pagination with page size selector | Done | `fees/page.tsx` |
| Mark Paid / Mark Unpaid toggle | Done | `fees/page.tsx` |
| Optimistic UI update (no table flash) | Done | `fees/page.tsx` |
| Per-student fee history on detail page | Done | `students/[id]/page.tsx` |
| Fee history sorting + pagination | Done | `students/[id]/page.tsx` |
| Multi-currency support (GBP, USD, PKR, SAR, BHD) | Done | All fee views |

---

## 7. Currency Conversion

| Feature | Status | Files |
|---------|--------|-------|
| Live exchange rates via open.er-api.com (free, no key) | Done | `exchange-rates.ts` |
| 1-hour rate caching | Done | `exchange-rates.ts` |
| Fallback rates if API fails | Done | `exchange-rates.ts` |
| PKR conversion on all fee displays | Done | `fee-display.tsx` |
| Original currency + PKR shown side by side | Done | `fee-display.tsx` |
| Summary totals converted to PKR | Done | Dashboard + Fees page |
| Per-currency breakdown on summary cards | Done | Dashboard + Fees page |

---

## 8. Dashboard (`/`)

| Feature | Status | Files |
|---------|--------|-------|
| Stat cards: Active Students, Total Students, Collected, Pending | Done | `page.tsx` |
| Recent students list (last 5) | Done | `page.tsx` |
| Unpaid fees this month (with View All link) | Done | `page.tsx` |
| PKR totals with currency breakdown | Done | `page.tsx` |

---

## 9. UI Components (shadcn/ui, customized)

| Component | Custom Features |
|-----------|-----------------|
| `button.tsx` | Gradient variants, gold variant, press scale |
| `card.tsx` | Rounded-2xl, subtle borders |
| `input.tsx` | Dark bg, emerald focus glow |
| `select.tsx` | Dark dropdown, emerald check |
| `badge.tsx` | Success (emerald), Warning (amber) variants |
| `progress.tsx` | Gradient bar with glow tip |
| `dialog.tsx` | Dark overlay, backdrop blur |
| `textarea.tsx` | Matching dark input style |
| `label.tsx` | Muted foreground |
| `time-picker.tsx` | Scroll-wheel picker with hour/minute/AM-PM columns |
| `pagination.tsx` | Page numbers, size selector, first/last buttons |
| `sortable-header.tsx` | Click-to-sort with arrow indicators + sort utilities |
| `quran-progress.tsx` | 3 variants: compact/card/full |
| `fee-display.tsx` | Dual currency display (original + PKR) |

---

## 10. Database Schema

### Tables
| Table | Purpose |
|-------|---------|
| `students` | Student records with all fields |
| `fee_payments` | Monthly fee tracking per student |
| `memorization_catalog` | Shared catalog of memorization items |
| `student_memorization` | Many-to-many: student-item assignments |

### Storage
| Bucket | Purpose |
|--------|---------|
| `memorization-images` | Public bucket for memorization item images |

### RLS
All tables have permissive RLS policies (private tool, no auth).

---

## Files Overview

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── layout.tsx                  # Root layout + sidebar
│   ├── globals.css                 # Theme + patterns + animations
│   ├── students/
│   │   ├── page.tsx                # Student list
│   │   ├── new/page.tsx            # Add student form
│   │   └── [id]/page.tsx           # Student detail + edit + fees
│   ├── class/page.tsx              # Class session viewer
│   ├── memorization/page.tsx       # Memorization catalog
│   └── fees/page.tsx               # Fee management
├── components/
│   ├── sidebar.tsx                 # Navigation sidebar
│   ├── quran-progress.tsx          # Quran progress display
│   ├── fee-display.tsx             # Dual currency display
│   └── ui/                         # 14 shadcn/ui components
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── utils.ts                    # cn(), currencies, countries, status config
│   └── exchange-rates.ts           # Live PKR conversion
supabase/
├── schema.sql                      # Full schema + seed data
├── migration_quran_progress.sql    # Quran fields migration
├── migration_memorization.sql      # Memorization tables migration
└── setup_storage.sql               # Storage bucket setup
```

---

## What's NOT Built Yet

- [ ] Authentication / multi-user support
- [ ] Attendance tracking per class session
- [ ] Student progress history / timeline
- [ ] Fee receipt generation / PDF export
- [ ] Notifications / reminders for unpaid fees
- [ ] Student performance reports
- [ ] Bulk fee marking (mark all paid for a month)
- [ ] Dark/Light theme toggle
- [ ] Mobile PWA / offline support
- [ ] Backup / data export
