import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Shared, hoisted mock state so the factory below can read it.
const state = vi.hoisted(() => ({ user: null as null | { id: string }, rotate: true }))

// Mock the Supabase SSR client. getUser() simulates token rotation by writing a
// refreshed cookie through the same cookies.setAll the real client uses.
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, opts: any) => ({
    auth: {
      getUser: async () => {
        if (state.rotate) {
          opts.cookies.setAll([
            { name: "sb-access-token", value: "rotated-token", options: { path: "/" } },
          ])
        }
        return { data: { user: state.user } }
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
})
