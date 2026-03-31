# Quran Academy - Student Management Dashboard

A Next.js 14 dashboard for managing Quran students, class sessions, and monthly fee tracking. Built with Supabase, Tailwind CSS, and shadcn/ui.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and add your Supabase project URL and anon key.

3. **Run the database schema**
   Go to your Supabase project → SQL Editor → paste and run the contents of `supabase/schema.sql`.

4. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Overview stats, recent students, unpaid fees this month |
| `/students` | Student List | Searchable table of all students with status badges |
| `/students/new` | Add Student | Form to register a new student |
| `/students/[id]` | Student Detail | View/edit student info, toggle fee payments |
| `/class` | Class Session | Select a student to view their class card during lessons |
| `/fees` | Fee Management | Month-by-month fee tracking with mark paid/unpaid toggles |

## How to Use

### Adding a Student
1. Go to **Students** → click **Add Student**
2. Fill in name, guardian, start date, and monthly fee (required)
3. Optionally set para number, memorizing progress, and class time
4. Click **Add Student**

### Marking Fees
1. Go to **Fees** → select a month and year
2. Fee records are auto-created for all active students
3. Click **Mark Paid** or **Mark Unpaid** to toggle payment status
4. You can also toggle fees from each student's detail page

## Tech Stack

- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL database)
- **Tailwind CSS** + **shadcn/ui** (UI components)
- **date-fns** (date formatting)
- **Lucide React** (icons)

All times reference Pakistan Standard Time (PKT, UTC+5).
