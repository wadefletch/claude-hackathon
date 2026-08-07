import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  HOUSING_SODA_URL,
  HousingDevelopment,
  HousingDetail,
  ProfilePatch,
  UserProfile,
  housingToFeatureCollection,
  mockHousingDetail,
  normalizeTransportMode,
  parseSocrataHousing,
  profileJsonSchema,
  toAppMapLocation,
} from "./index"
import { sampleProfile } from "./fixtures/sampleProfile"

describe("UserProfile", () => {
  it("accepts the sample profile", () => {
    expect(() => UserProfile.parse(sampleProfile)).not.toThrow()
  })

  it("accepts an empty ProfilePatch (agent no-op)", () => {
    expect(() => ProfilePatch.parse({})).not.toThrow()
  })

  it("accepts a partial ProfilePatch that only touches housingNeeds", () => {
    expect(() =>
      ProfilePatch.parse({ housingNeeds: { bedroomsNeeded: 3 } })
    ).not.toThrow()
  })

  it("exposes a valid JSON Schema for the agent contract", () => {
    expect(profileJsonSchema).toMatchObject({ type: "object" })
  })
})

describe("parseSocrataHousing", () => {
  const rawRow = {
    community_area: "Avondale",
    community_area_number: "21",
    property_type: "Multifamily",
    property_name: "Hairpin Lofts",
    address: "3414 W. Diversey Ave.",
    zip_code: "60647",
    phone_number: "773-292-6360",
    management_company: "Leasing & Management Co. Inc.",
    units: "25",
    latitude: "41.93207259",
    longitude: "-87.71287204",
  }

  it("normalizes a raw row into a valid HousingDevelopment", () => {
    const dev = parseSocrataHousing(rawRow)
    expect(dev).not.toBeNull()
    expect(() => HousingDevelopment.parse(dev)).not.toThrow()
    expect(dev).toMatchObject({
      propertyName: "Hairpin Lofts",
      units: 25,
      communityAreaNumber: 21,
      location: { lat: 41.93207259, lng: -87.71287204 },
    })
    expect(dev?.id).toBe("hairpin-lofts-3414-w-diversey-ave")
  })

  it("returns null when coordinates are missing", () => {
    expect(
      parseSocrataHousing({ ...rawRow, latitude: "", longitude: "" })
    ).toBeNull()
  })

  it("builds a GeoJSON FeatureCollection with [lng, lat] order", () => {
    const dev = parseSocrataHousing(rawRow)!
    const fc = housingToFeatureCollection([dev])
    expect(fc.type).toBe("FeatureCollection")
    expect(fc.features[0].geometry.coordinates).toEqual([
      -87.71287204, 41.93207259,
    ])
  })
})

describe("alignment with the UI model (main)", () => {
  it("maps the UI's legacy transport labels onto our enum", () => {
    expect(normalizeTransportMode("train")).toBe("transit")
    expect(normalizeTransportMode("drive")).toBe("car")
    expect(normalizeTransportMode("rideshare")).toBe("rideshare")
    expect(normalizeTransportMode("walk")).toBe("walk")
    expect(normalizeTransportMode("teleport")).toBeNull()
  })

  it("produces a valid HousingDetail with the UI-shaped review model", () => {
    const detail = mockHousingDetail("hairpin-lofts-3414-w-diversey-ave")
    expect(() => HousingDetail.parse(detail)).not.toThrow()
    expect(detail.reviews?.[0]).toMatchObject({
      platform: expect.any(String),
      text: expect.any(String),
      isMock: true,
    })
    expect(detail.sourceSummaries?.length).toBeGreaterThan(0)
    expect(detail.rentUsd).toBeGreaterThan(0)
  })

  it("adapts a {lat,lng} into an AppMap [lng,lat] tuple", () => {
    const loc = toAppMapLocation({ lat: 41.9, lng: -87.7 }, "Home")
    expect(loc).toEqual({ label: "Home", coordinates: [-87.7, 41.9] })
  })
})

describe("live Chicago Open Data (network)", () => {
  it("parses real rows from the SODA endpoint", async () => {
    let rows: unknown
    try {
      const res = await fetch(`${HOUSING_SODA_URL}?$limit=5`)
      rows = await res.json()
    } catch {
      // Offline / CI without network — skip rather than fail the suite.
      return
    }
    const parsed = z.array(z.unknown()).parse(rows).map(parseSocrataHousing)
    const valid = parsed.filter((d): d is NonNullable<typeof d> => d !== null)
    expect(valid.length).toBeGreaterThan(0)
    for (const dev of valid) {
      expect(() => HousingDevelopment.parse(dev)).not.toThrow()
    }
  })
})
