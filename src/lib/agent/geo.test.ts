import { describe, expect, it } from "vitest"

import { estimateDurationMinutes, haversineMeters, haversineMiles } from "./geo"

describe("geo utilities", () => {
  it("computes distance between The Loop and Hyde Park within known bounds", () => {
    const loop = { lat: 41.8825, lng: -87.6339 }
    const hydePark = { lat: 41.7943, lng: -87.5907 }
    const miles = haversineMiles(loop, hydePark)
    expect(miles).toBeGreaterThan(6)
    expect(miles).toBeLessThan(8)
  })

  it("returns zero distance for identical points", () => {
    const point = { lat: 41.88, lng: -87.63 }
    expect(haversineMiles(point, point)).toBe(0)
  })

  it("converts miles to meters consistently", () => {
    const a = { lat: 41.88, lng: -87.63 }
    const b = { lat: 41.9, lng: -87.65 }
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMiles(a, b) * 1609.34, 1)
  })

  it("estimates a longer duration for walking than driving over the same distance", () => {
    const walkMinutes = estimateDurationMinutes(5, "walk")
    const carMinutes = estimateDurationMinutes(5, "car")
    expect(walkMinutes).toBeGreaterThan(carMinutes)
  })
})
