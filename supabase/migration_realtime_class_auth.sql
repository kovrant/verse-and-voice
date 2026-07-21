-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime Authorization for the live-class channels.
--
-- Channel topic: "class:<studentId>". This locks each channel to just the two
-- people who should be on it — the teacher, or the one student the channel
-- belongs to — for both reading (receiving broadcasts + presence) and writing
-- (sending broadcasts + tracking presence).
--
-- This RLS only affects channels created with { config: { private: true } }.
-- Public channels are unaffected. The client enables `private` only when
-- NEXT_PUBLIC_REALTIME_PRIVATE=true, so apply THIS SQL first, then set that env.
--
-- Relies on the existing SECURITY DEFINER helpers from
-- migration_student_portal.sql: public.is_teacher() and public.my_student_id().
--
-- NOTE: do NOT run `alter table realtime.messages enable row level security` —
-- that table is owned by a Supabase internal role (you'll get "must be owner of
-- table messages") and RLS is already enabled on it by default. Just create the
-- policies below.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "class channel members can read" on realtime.messages;
create policy "class channel members can read"
on realtime.messages
for select
to authenticated
using (
  ((select realtime.topic()) like 'class:%')
  and (
    public.is_teacher()
    or substring((select realtime.topic()) from 'class:(.*)') = public.my_student_id()::text
  )
);

drop policy if exists "class channel members can write" on realtime.messages;
create policy "class channel members can write"
on realtime.messages
for insert
to authenticated
with check (
  ((select realtime.topic()) like 'class:%')
  and (
    public.is_teacher()
    or substring((select realtime.topic()) from 'class:(.*)') = public.my_student_id()::text
  )
);
