---
type: architecture
title: "Authentication and Role Hierarchy"
description: "Authentication mechanism, role precedence rules, and deterministic student username mapping."
status: stable
verified: true
sources:
  - "src/lib/student-auth.ts"
  - "src/lib/api-auth.ts"
  - "src/middleware.ts"
  - "supabase/migration_student_portal.sql"
tags:
  - auth
  - rbac
  - jwt
  - roles
---

# Authentication and Role Hierarchy

Quran Academy uses Supabase Auth with custom role claims and a specialized username mapping layer for students.

---

## 🔑 Role Precedence and Hierarchy

Roles exist in two locations:
1. **`user.app_metadata.role` (JWT):** Encoded directly into the access token. Cheap, local read requiring zero database queries.
2. **`profiles.role` (Database):** Fallback table row for accounts predating JWT metadata mirroring.

### Critical Invariant: Role Evaluation Logic
```typescript
// src/lib/student-auth.ts
export function isTeacherRole(
  jwtRole: string | null | undefined,
  profileRole: string | null | undefined,
): boolean {
  return (jwtRole ?? profileRole) === "teacher"
}
```

> [!WARNING]
> **Privilege Escalation Trap:** An account with **neither** signal is strictly **NOT** a teacher. Historically, API routes defaulted a missing role to "teacher", which accidentally granted administrative powers and live-class control to unassigned authenticated users.

---

## 🧑‍🎓 Student Credentials & Username Mapping

Supabase Auth natively requires an email address. However, Quran Academy students log in using simple, memorizable **usernames**.

### Deterministic Email Generation
Student usernames are deterministically mapped to synthetic email addresses using a dedicated internal domain:

```typescript
// src/lib/student-auth.ts
export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${STUDENT_EMAIL_DOMAIN}`
}
```

* **Environment Variable:** `NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN` (defaults to `students.quran-academy.app`).
* **Rule:** Usernames are lowercased and trimmed, matching `/^[a-z0-9._-]{3,30}$/`.
* **Permanent Invariant:** **Never change `NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN` in production.** Changing this value breaks authentication for every existing student in the database.

---

## 🚫 Account Suspension (`login_disabled`)

Teachers can disable student access from the dashboard:
* **Storage:** Flagged directly in `app_metadata.login_disabled = true`.
* **Immediate Revocation:** The server revokes active sessions via `/api/students/[id]/access`.
* **Edge Interception:** `src/middleware.ts` detects `login_disabled === true`, clears all auth cookies locally without a network call, and bounces the client to `/login?blocked=1`.

---

## 🛡️ API Route Protection (`src/lib/api-auth.ts`)

Every route under `/api/**` that performs teacher actions must use `requireTeacher()`:

```typescript
import { requireTeacher } from "@/lib/api-auth"

export async function POST(req: Request) {
  const { user, denied } = await requireTeacher()
  if (denied) return denied

  // Secure teacher-only execution below...
}
```
* Never re-implement role validation inline inside API routes.
* API routes use the server-role admin client (`src/lib/supabase-admin.ts`) to bypass RLS after role authorization is complete.
