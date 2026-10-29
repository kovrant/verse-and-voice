import type { StudentGender } from "@/lib/utils"

/** Avatar variants per gender in public/avatars (boy-1.png … girl-4.png). */
export const AVATAR_VARIANTS = 4

/**
 * Teacher-portal avatar for a student: one of the boy/girl images, picked by a
 * stable hash of the id so a student keeps the same face across visits.
 * Null when the teacher hasn't set boy/girl yet (callers show an initial).
 */
export function studentAvatarSrc(id: string, gender: StudentGender | null | undefined) {
  if (gender !== "boy" && gender !== "girl") return null
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return `/avatars/${gender}-${(hash % AVATAR_VARIANTS) + 1}.png`
}
