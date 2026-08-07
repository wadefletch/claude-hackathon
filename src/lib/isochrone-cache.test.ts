import type { FeatureCollection, Polygon } from "geojson"
import { describe, expect, it } from "vitest"

import {
  readCachedIsochrone,
  writeCachedIsochrone,
} from "@/lib/isochrone-cache"

const query = {
  coordinates: [-87.6298, 41.8781] as const,
  mode: "transit",
  minutes: 35,
}

const data: FeatureCollection<Polygon> = {
  type: "FeatureCollection",
  features: [],
}

function createStorage() {
  const entries = new Map<string, string>()

  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  }
}

describe("isochrone cache", () => {
  it("persists and returns an identical request", () => {
    const storage = createStorage()

    writeCachedIsochrone(storage, query, data)

    expect(readCachedIsochrone(storage, query)).toEqual(data)
    expect(storage.entries.size).toBe(1)
  })

  it("does not reuse data for a different commute range", () => {
    const storage = createStorage()
    writeCachedIsochrone(storage, query, data)

    expect(
      readCachedIsochrone(storage, { ...query, minutes: query.minutes + 5 })
    ).toBeNull()
  })

  it("removes malformed cache entries", () => {
    const storage = createStorage()
    writeCachedIsochrone(storage, query, data)
    const [key] = storage.entries.keys()
    storage.entries.set(key, "not json")

    expect(readCachedIsochrone(storage, query)).toBeNull()
    expect(storage.entries.size).toBe(0)
  })

  it("ignores storage quota failures", () => {
    const storage = createStorage()
    storage.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError")
    }

    expect(() => writeCachedIsochrone(storage, query, data)).not.toThrow()
  })
})
