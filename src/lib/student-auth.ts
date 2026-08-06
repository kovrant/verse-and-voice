// Shared helpers for student credentials.
//
// The teacher creates a student login with a *username* + password. Supabase
// Auth is email-based, so we deterministically map a username to a synthetic
// email under a dedicated domain. The domain must match on both the client
// (login form) and the server (credential API), hence the NEXT_PUBLIC_ var.

export const STUDENT_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || "students.quran-academy.app"

/** Usernames: letters, digits, dot, underscore, hyphen; 3–30 chars. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username))
}

/** Map a username to its synthetic auth email. */
export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${STUDENT_EMAIL_DOMAIN}`
}

/** A login identifier is treated as an email if it contains "@". */
export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes("@")
}

/**
 * Has a teacher turned off this student's portal sign-in? The flag lives on the
 * auth user's app_metadata (JWT), read the same no-DB-round-trip way as `role`.
 */
export function isLoginDisabled(
  appMetadata: { login_disabled?: boolean } | null | undefined,
): boolean {
  return appMetadata?.login_disabled === true
}

/**
 * Does this account count as a teacher? Roles live in two places:
 * `app_metadata.role` on the JWT and `profiles.role` in the DB, and
 * migration_student_portal.sql sets both for the teacher. The JWT wins when
 * present (it's the cheap read); the profile is the fallback for accounts that
 * predate the metadata mirroring.
 *
 * An account with neither signal is NOT a teacher. The API routes used to
 * default that case to "teacher", which handed announcement and live-class
 * powers to any authenticated account without a profile row.
 */
export function isTeacherRole(
  jwtRole: string | null | undefined,
  profileRole: string | null | undefined,
): boolean {
  return (jwtRole ?? profileRole) === "teacher"
}

/**
 * Resolve whatever the user typed in the single login field into the email
 * Supabase expects: real email as-is, bare username → synthetic student email.
 */
export function resolveLoginEmail(identifier: string): string {
  const value = identifier.trim()
  return isEmailIdentifier(value) ? value : usernameToEmail(value)
}
