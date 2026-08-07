import { describe, expect, it } from "vitest"

import {
  amiLimitForHouseholdSize,
  FIXTURE_AMENITIES,
  FIXTURE_SCHOOLS,
  FIXTURE_TRANSIT_STOPS,
} from "./fixtures"

function withinChicagoBounds(location: { lat: number; lng: number }) {
  return (
    location.lat > 41.6 &&
    location.lat < 42.1 &&
    location.lng > -87.9 &&
    location.lng < -87.5
  )
}

describe("agent fixtures", () => {
  it("gives every fixture a real-looking Chicago coordinate", () => {
    expect(FIXTURE_AMENITIES.length).toBeGreaterThan(0)
    expect(FIXTURE_SCHOOLS.length).toBeGreaterThan(0)
    expect(FIXTURE_TRANSIT_STOPS.length).toBeGreaterThan(0)
    for (const item of [
      ...FIXTURE_AMENITIES,
      ...FIXTURE_SCHOOLS,
      ...FIXTURE_TRANSIT_STOPS,
    ]) {
      expect(withinChicagoBounds(item.location)).toBe(true)
    }
  })

  it("includes multiple amenity categories", () => {
    const categories = new Set(FIXTURE_AMENITIES.map((a) => a.category))
    expect(categories.size).toBeGreaterThan(1)
  })

  it("scales the AMI limit up with household size", () => {
    const single = amiLimitForHouseholdSize(1)
    const family = amiLimitForHouseholdSize(4)
    expect(family).toBeGreaterThan(single)
  })
})
