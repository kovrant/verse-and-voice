export { backfillStudentAchievements } from "./backfill"
export { buildCertificateNumber } from "./certificates"
export {
  awardMemLesson,
  awardNamazCompleteBadge,
  type RoundProgress,
  type RoundRef,
  syncMemChunkAchievements,
  syncQuranRoundAchievements,
} from "./client"
export {
  isFullQuranComplete,
  newlyCompletedParas,
  parasCompleted,
  totalParas,
} from "./completion/quran"
export { khatmSlug, paraSlug, QAIDA_COMPLETE_SLUG, quizBadgeSlug, QURAN_HALF_SLUG, QURAN_KHATM_SLUG, slugIssuesCertificate } from "./slugs"
export type {
  AchievementDefinition,
  AchievementDomain,
  AchievementKind,
  StudentAchievement,
  StudentCertificate,
} from "./types"
