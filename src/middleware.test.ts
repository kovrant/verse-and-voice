import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Shared, hoisted mock state so the factory below can read it.
const state = vi.hoisted(() => ({ user: null as null | { id: string; app_metadata?: Record<string, unknown> }, rotate: true }))

// Mock the Supabase SSR client. getSession() reads from cookies locally — no
// network round-trip — which is what production middleware uses.
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, opts: any) => ({
    auth: {
      getSession: async () => {
        if (state.rotate) {
          opts.cookies.setAll([
            { name: "sb-access-token", value: "rotated-token", options: { path: "/" } },
          ])
        }
        return {
          data: { session: state.user ? { user: state.user } : null },
        }
      },
    },
  }),
}))

import { middleware } from "./middleware"

beforeEach(() => {
  state.user = null
  state.rotate = true
})

describe("middleware auth cookie handling (Bug 8)", () => {
  it("carries refreshed cookies onto the login redirect for anon users", async () => {
    const res = await middleware(new NextRequest(new URL("http://localhost/students")))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login")
    // The rotated cookie must survive the redirect, or the user gets logged out.
    expect(res.cookies.get("sb-access-token")?.value).toBe("rotated-token")
  })

  it("carries refreshed cookies when redirecting a logged-in user away from /login", async () => {
    state.user = { id: "u1" }
    const res = await middleware(new NextRequest(new URL("http://localhost/login")))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).not.toContain("/login")
    expect(res.cookies.get("sb-access-token")?.value).toBe("rotated-token")
  })

  it("passes through (no redirect) for an authenticated user on a normal page", async () => {
    state.user = { id: "u1" }
    state.rotate = false
    const res = await middleware(new NextRequest(new URL("http://localhost/students")))
    expect(res.headers.get("location")).toBeNull()
  })

  it("does NOT redirect a student's POST to an API route (activity logging)", async () => {
    // A student is confined to /student/*, but API routes authorize themselves —
    // redirecting them would drop the request body and break activity logging.
    state.user = { id: "s1", app_metadata: { role: "student" } } as any
    state.rotate = false
    const res = await middleware(
      new NextRequest(new URL("http://localhost/api/activity"), { method: "POST" }),
    )
    expect(res.headers.get("location")).toBeNull()
  })

  it("redirects login_disabled students to /login?blocked=1 and clears sb cookies", async () => {
    state.user = { id: "s1", app_metadata: { role: "student", login_disabled: true } }
    state.rotate = false
    const req = new NextRequest(new URL("http://localhost/student"))
    req.cookies.set("sb-test-auth-token", "stale")
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login")
    expect(res.headers.get("location")).toContain("blocked=1")
    expect(res.cookies.get("sb-test-auth-token")?.value).toBe("")
  })
})
