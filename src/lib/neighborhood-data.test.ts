import { describe, expect, it } from "vitest"

import { homes } from "./housing-data"
import {
  getNeighborhoodSnapshot,
  neighborhoodSnapshots,
} from "./neighborhood-data"

describe("neighborhood snapshots", () => {
  it("covers every home in the housing dataset exactly once", () => {
    expect(Object.keys(neighborhoodSnapshots).sort()).toEqual(
      homes.map((home) => home.id).sort()
    )
  })

  it("returns useful structured content for every home", () => {
    for (const home of homes) {
      const snapshot = getNeighborhoodSnapshot(home.id)
      expect(snapshot.overview.length).toBeGreaterThan(40)
      expect(snapshot.transit.length).toBeGreaterThanOrEqual(2)
      expect(snapshot.essentials.length).toBeGreaterThanOrEqual(3)
      expect(snapshot.facts.length).toBeGreaterThanOrEqual(3)
    }
  })
})
