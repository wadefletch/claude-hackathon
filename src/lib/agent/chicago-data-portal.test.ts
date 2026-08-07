import { describe, expect, it } from "vitest"

import { chicagoGeoJsonUrl } from "@/lib/chicago-data-portal"

describe("chicagoGeoJsonUrl", () => {
  it("builds a GeoJSON request with selected fields and a spatial filter", () => {
    const result = chicagoGeoJsonUrl("abcd-1234", {
      fields: ["location", "name"],
      limit: 2_000,
      order: "updated_at DESC",
      where: "status = 'OPEN'",
    })
    const url = new URL(result)

    expect(`${url.origin}${url.pathname}`).toBe(
      "https://data.cityofchicago.org/resource/abcd-1234.geojson"
    )
    expect(Object.fromEntries(url.searchParams)).toEqual({
      $limit: "2000",
      $order: "updated_at DESC",
      $select: "location,name",
      $where: "status = 'OPEN'",
    })
  })

  it("caps unfiltered requests at the shared default", () => {
    const url = new URL(chicagoGeoJsonUrl("abcd-1234"))

    expect(url.searchParams.get("$limit")).toBe("50000")
  })
})
