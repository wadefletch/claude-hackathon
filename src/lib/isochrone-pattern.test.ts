import { describe, expect, it } from "vitest"

import {
  pendingIsochronePatternExpression,
  pendingIsochronePatternSizeAtZoom,
} from "@/lib/isochrone-pattern"

describe("pending isochrone pattern", () => {
  it("scales with the map at each zoom level", () => {
    expect(pendingIsochronePatternSizeAtZoom(10)).toBe(14)
    expect(pendingIsochronePatternSizeAtZoom(11)).toBe(28)
    expect(pendingIsochronePatternSizeAtZoom(9)).toBe(7)
  })

  it("selects a theme-specific sprite for each integer zoom", () => {
    const expression = pendingIsochronePatternExpression("dark")

    expect(expression).toContainEqual([
      "image",
      "pending-isochrone-pattern-dark-10",
    ])
    expect(expression).toContainEqual([
      "image",
      "pending-isochrone-pattern-dark-17",
    ])
  })
})
