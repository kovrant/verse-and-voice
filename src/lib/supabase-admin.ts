import "server-only"
import { createClient } from "@supabase/supabase-js"

// Service-role client — bypasses RLS and can use the Auth admin API
// (createUser / updateUserById). NEVER import this into a Client Component;
// the "server-only" guard makes such an import a build error.
//
// Requires SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard → Project Settings →
// API → service_role secret). Keep it server-side only.

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase admin env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    )
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
