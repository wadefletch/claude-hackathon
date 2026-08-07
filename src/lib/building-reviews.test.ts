import { describe, expect, it } from "vitest"

import { homes } from "./housing-data"
import { getBuildingReviewData, hasReviewProfile } from "./building-reviews"

describe("mock building reviews", () => {
  it("covers every building with all three review sources", () => {
    const expectedSources = ["Google Reviews", "Apartments.com", "Zillow"]

    for (const home of homes) {
      expect(hasReviewProfile(home.id)).toBe(true)
      const data = getBuildingReviewData(home)
      expect(data.isMock).toBe(true)
      expect(data.reviews.map((review) => review.source)).toEqual(
        expectedSources
      )
      expect(data.reviews.map((review) => review.isMock)).toEqual([
        true,
        true,
        true,
      ])
      expect(data.totalReviewCount).toBeGreaterThan(0)
    }
  })

  it("returns building-specific copy and aggregates", () => {
    const first = getBuildingReviewData(homes[0])
    const second = getBuildingReviewData(homes[1])

    expect(first.reviews[0].text).toContain(homes[0].name)
    expect(second.reviews[0].text).toContain(homes[1].name)
    expect(first.reviews[0].text).not.toBe(second.reviews[0].text)
    expect(first.averageRating).toBeGreaterThanOrEqual(1)
    expect(first.averageRating).toBeLessThanOrEqual(5)
  })
})
