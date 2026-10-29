import type { StudentGender } from "@/lib/utils"

/**
 * Avatar images in public/avatars, per gender. Add a file there and list it
 * here to give students more variety; each student keeps the same one.
 */
export const AVATARS: Record<StudentGender, string[]> = {
  boy: ["boy-1.jpg"],
  girl: ["girl-1.jpg"],
}

/**
 * Teacher-portal avatar for a student: one of the boy/girl images, picked by a
 * stable hash of the id so a student keeps the same face across visits.
 * Null when the teacher hasn't set boy/girl yet (callers show an initial).
 */
export function studentAvatarSrc(id: string, gender: StudentGender | null | undefined) {
  if (gender !== "boy" && gender !== "girl") return null
  const files = AVATARS[gender]
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return `/avatars/${files[hash % files.length]}`
}
