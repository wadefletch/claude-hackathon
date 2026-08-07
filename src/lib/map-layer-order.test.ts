import { describe, expect, it } from "vitest"

import { findPostGeometryLabelLayer } from "./map-layer-order"

describe("findPostGeometryLabelLayer", () => {
  it("places application layers above CARTO roads despite an early waterway label", () => {
    const cartoStyleLayers = [
      { id: "background", type: "background" },
      { id: "waterway_label", type: "symbol" },
      { id: "tunnel_service_case", type: "line" },
      { id: "road_mot_fill_noramp", type: "line" },
      { id: "building-top", type: "fill" },
      { id: "boundary_country_inner", type: "line" },
      { id: "watername_ocean", type: "symbol" },
      { id: "roadname_minor", type: "symbol" },
    ]

    expect(findPostGeometryLabelLayer(cartoStyleLayers)).toBe("watername_ocean")
  })

  it("uses the first label when a style keeps all labels after geometry", () => {
    expect(
      findPostGeometryLabelLayer([
        { id: "land", type: "fill" },
        { id: "roads", type: "line" },
        { id: "places", type: "symbol" },
        { id: "road-labels", type: "symbol" },
      ])
    ).toBe("places")
  })

  it("falls back to the top of the stack when no trailing label block exists", () => {
    expect(
      findPostGeometryLabelLayer([
        { id: "background", type: "background" },
        { id: "water", type: "fill" },
      ])
    ).toBeUndefined()
  })
})
