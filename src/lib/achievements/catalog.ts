import type { SupabaseClient } from "@supabase/supabase-js"

import { domainForSlug, slugIssuesCertificate } from "./slugs"
import type { AchievementDomain, AchievementKind } from "./types"

export interface EnsureDefinitionInput {
  slug: string
  title: string
  description?: string
  domain?: AchievementDomain
  kind?: AchievementKind
  issuesCertificate?: boolean
  metadata?: Record<string, unknown>
}

/** Insert a catalog row when slug is dynamic (memorization parts, repeat khatms). */
export async function ensureDefinition(
  db: SupabaseClient,
  input: EnsureDefinitionInput,
): Promise<string | null> {
  const { data: existing } = await db
    .from("achievement_definitions")
    .select("id")
    .eq("slug", input.slug)
    .maybeSingle()
  if (existing?.id) return existing.id

  const domain = input.domain ?? domainForSlug(input.slug)
  const issuesCertificate = input.issuesCertificate ?? slugIssuesCertificate(input.slug)

  const { data: created, error } = await db
    .from("achievement_definitions")
    .insert({
      slug: input.slug,
      domain,
      kind: input.kind ?? (issuesCertificate ? "certificate" : "badge"),
      title: input.title,
      description: input.description ?? input.title,
      issues_certificate: issuesCertificate,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .maybeSingle()

  if (error || !created?.id) return null
  return created.id
}
