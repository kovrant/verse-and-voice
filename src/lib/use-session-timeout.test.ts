import { describe, expect, it, vi } from "vitest"

// The module imports the browser Supabase client at load; stub it so the pure
// helper can be imported in a plain node test.
vi.mock("@/lib/supabase", () => ({ supabase: {} }))

import { MAX_SESSION_MS, msUntilExpiry, resolveSessionStartMs } from "./use-session-timeout"

describe("resolveSessionStartMs", () => {
  const now = 1_000_000

  it("starts a fresh window on explicit login", () => {
    expect(resolveSessionStartMs(String(now - MAX_SESSION_MS - 1), now, { freshLogin: true })).toEqual({
      start: now,
    })
  })

  it("reuses a stored anchor on reload", () => {
    const stored = String(now - 60_000)
    expect(resolveSessionStartMs(stored, now)).toEqual({ start: now - 60_000 })
  })

  it("expires a stale anchor when the tab reloads after 3h", () => {
    expect(resolveSessionStartMs(String(now - MAX_SESSION_MS - 1), now)).toEqual({ expired: true })
  })
})

describe("msUntilExpiry", () => {
  const start = 1_000_000

  it("returns the full window at the moment of login", () => {
    expect(msUntilExpiry(start, start)).toBe(MAX_SESSION_MS)
  })

  it("counts down as time passes", () => {
    expect(msUntilExpiry(start, start + 60_000)).toBe(MAX_SESSION_MS - 60_000)
  })

  it("is <= 0 once the 3-hour window has elapsed (triggers sign-out)", () => {
    expect(msUntilExpiry(start, start + MAX_SESSION_MS)).toBe(0)
    expect(msUntilExpiry(start, start + MAX_SESSION_MS + 1)).toBeLessThan(0)
  })
})
