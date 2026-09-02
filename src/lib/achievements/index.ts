export {
  syncQuranRoundAchievements,
  syncMemChunkAchievements,
  awardMemLesson,
  awardNamazCompleteBadge,
  type RoundProgress,
  type RoundRef,
} from "./client"

export type {
  AchievementDefinition,
  AchievementDomain,
  AchievementKind,
  StudentAchievement,
  StudentCertificate,
} from "./types"

export {
  parasCompleted,
  totalParas,
  newlyCompletedParas,
  isFullQuranComplete,
} from "./completion/quran"

export { paraSlug, khatmSlug, QAIDA_COMPLETE_SLUG, QURAN_HALF_SLUG, QURAN_KHATM_SLUG, slugIssuesCertificate } from "./slugs"

export { buildCertificateNumber } from "./certificates"

export { backfillStudentAchievements } from "./backfill"
