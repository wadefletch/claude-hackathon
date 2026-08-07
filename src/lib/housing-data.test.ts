import { describe, expect, it } from "vitest"

import {
  commuteFor,
  getManualResults,
  getOptimizedResults,
  homes,
} from "./housing-data"

describe("housing explorer model", () => {
  it("uses deterministic mode factors", () => {
    expect(commuteFor(homes[0], "train")).toBe(47)
    expect(commuteFor(homes[0], "drive")).toBe(37)
    expect(commuteFor(homes[0], "rideshare")).toBe(32)
  })

  it("shows every home reachable by the selected manual mode", () => {
    const result = getManualResults("train", 15)
    expect(result.results.map((home) => home.id)).toEqual(["loop"])
    expect(result.winnerId).toBeNull()
  })

  it("chooses the lowest-rent home on the cheapest reachable paid mode", () => {
    const result = getOptimizedResults("cheapest", 35)
    expect(result.mode).toBe("train")
    expect(result.results[0].id).toBe("little-village")
  })

  it("chooses the shortest commute on the fastest mode", () => {
    const result = getOptimizedResults("quickest", 35)
    expect(result.mode).toBe("rideshare")
    expect(result.results[0].id).toBe("loop")
  })
})
