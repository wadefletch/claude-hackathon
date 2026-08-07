import type { FeatureCollection, Polygon } from "geojson"
import { describe, expect, it } from "vitest"

import { interpolateIsochrone } from "@/lib/isochrone-animation"

function square(radius: number): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-radius, -radius],
              [radius, -radius],
              [radius, radius],
              [-radius, radius],
              [-radius, -radius],
            ],
          ],
        },
      },
    ],
  }
}

describe("interpolateIsochrone", () => {
  it("preserves the exact start and end geometries", () => {
    const from = square(1)
    const to = square(2)

    expect(interpolateIsochrone(from, to, 0)).toBe(from)
    expect(interpolateIsochrone(from, to, 1)).toBe(to)
  })

  it("grows a closed polygon boundary between commute ranges", () => {
    const halfway = interpolateIsochrone(square(1), square(2), 0.5)
    const ring = (halfway.features[0].geometry as Polygon).coordinates[0]

    expect(ring[0][0]).toBeCloseTo(-1.5)
    expect(ring[0][1]).toBeCloseTo(-1.5)
    expect(ring.at(-1)).toEqual(ring[0])
  })

  it("shrinks the boundary when the commute range decreases", () => {
    const halfway = interpolateIsochrone(square(2), square(1), 0.5)
    const ring = (halfway.features[0].geometry as Polygon).coordinates[0]

    expect(ring[0][0]).toBeCloseTo(-1.5)
    expect(ring[0][1]).toBeCloseTo(-1.5)
  })

  it("snaps instead of distorting a topology change", () => {
    const from = square(1)
    const to = square(2)
    const geometry = to.features[0].geometry
    geometry.coordinates.push([
      [-0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
      [0.5, -0.5],
      [-0.5, -0.5],
    ])

    expect(interpolateIsochrone(from, to, 0.5).features[0].geometry).toEqual(
      geometry
    )
  })
})
