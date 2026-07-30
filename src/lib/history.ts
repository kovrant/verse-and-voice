// Shared shape + labels for the Islamic history module (teacher admin + student reader).

/** Full `islamic_history` row. Student pages select a subset — narrow with `Pick`. */
export interface HistoryStory {
  id: string
  title: string
  arabic_title: string | null
  summary: string | null
  content: string | null
  category: string
  hijri_month: number | null
  cover_image_url: string | null
  file_url: string | null
  file_type: string | null
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export const CATEGORIES = [
  "Prophets",
  "Companions",
  "Battles",
  "Events",
  "Places",
  "Other",
] as const

export const CATEGORY_ICON: Record<string, string> = {
  Prophets: "🕌",
  Companions: "🤝",
  Battles: "⚔️",
  Events: "📅",
  Places: "🕋",
  Other: "📜",
}
