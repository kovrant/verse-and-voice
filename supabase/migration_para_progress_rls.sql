-- ─────────────────────────────────────────────────────────────────────────────
-- RLS for student_para_progress (per-(student, para) last-read page).
--
-- The table was created with RLS enabled but no policies, so every read/write
-- was denied (PostgREST 403) — the live class's "resume at last page" and the
-- debounced page-save were silently failing. These policies mirror the rest of
-- the schema: teachers manage everyone, a student reads/writes only their own.
--
-- Relies on the SECURITY DEFINER helpers from migration_student_portal.sql:
-- public.is_teacher() and public.my_student_id().
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.student_para_progress enable row level security;

-- Teachers: full access to every student's progress.
drop policy if exists "Teacher full access on student_para_progress" on public.student_para_progress;
create policy "Teacher full access on student_para_progress"
  on public.student_para_progress for all to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

-- Students: read + write only their own row.
drop policy if exists "Student read own para_progress" on public.student_para_progress;
create policy "Student read own para_progress"
  on public.student_para_progress for select to authenticated
  using (student_id = public.my_student_id());

drop policy if exists "Student write own para_progress" on public.student_para_progress;
create policy "Student write own para_progress"
  on public.student_para_progress for insert to authenticated
  with check (student_id = public.my_student_id());

drop policy if exists "Student update own para_progress" on public.student_para_progress;
create policy "Student update own para_progress"
  on public.student_para_progress for update to authenticated
  using (student_id = public.my_student_id())
  with check (student_id = public.my_student_id());
