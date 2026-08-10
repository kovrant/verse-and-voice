import { describe, expect, it } from "vitest"

import { resolveAssignedQaida } from "./qaida"

describe("resolveAssignedQaida", () => {
  const items = [
    { id: "a", title: "Noorani Qaida", file_url: "/a.pdf" },
    { id: "b", title: "Baghdadi Qaida", file_url: "/b.pdf" },
  ]

  it("returns the item whose id matches the assignment", () => {
    expect(resolveAssignedQaida(items, "b")).toEqual(items[1])
  })

  it("returns null when nothing is assigned or the id is unknown", () => {
    expect(resolveAssignedQaida(items, null)).toBeNull()
    expect(resolveAssignedQaida(items, undefined)).toBeNull()
    expect(resolveAssignedQaida(items, "missing")).toBeNull()
  })
})
