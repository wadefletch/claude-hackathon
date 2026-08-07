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

  it("gives transit a floor from its fixed access overhead even for very short trips", () => {
    const minutes = estimateDurationMinutes(0.2, "transit")
    expect(minutes).toBeGreaterThan(10)
  })

  it("orders modes walk slower than transit slower than car at the same distance", () => {
    const walkMinutes = estimateDurationMinutes(5, "walk")
    const transitMinutes = estimateDurationMinutes(5, "transit")
    const carMinutes = estimateDurationMinutes(5, "car")
    expect(walkMinutes).toBeGreaterThan(transitMinutes)
    expect(transitMinutes).toBeGreaterThan(carMinutes)
  })

  it("pins transit estimates to known-good sanity values", () => {
    expect(estimateDurationMinutes(1.5, "transit")).toBe(19)
    expect(estimateDurationMinutes(3.5, "transit")).toBe(27)
    expect(estimateDurationMinutes(5, "transit")).toBe(34)
  })

  it("pins car and walk estimates to known-good sanity values", () => {
    expect(estimateDurationMinutes(5, "car")).toBe(22)
    expect(estimateDurationMinutes(1.5, "walk")).toBe(38)
  })
})
