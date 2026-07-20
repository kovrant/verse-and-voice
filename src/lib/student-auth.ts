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
 * Resolve whatever the user typed in the single login field into the email
 * Supabase expects: real email as-is, bare username → synthetic student email.
 */
export function resolveLoginEmail(identifier: string): string {
  const value = identifier.trim()
  return isEmailIdentifier(value) ? value : usernameToEmail(value)
}
