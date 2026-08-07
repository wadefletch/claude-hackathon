import { describe, expect, it } from "vitest"

import { sampleProfile } from "@/domain/fixtures/sampleProfile"

import { rankedHousingMatchSchema, showMapInputSchema } from "./schemas"

describe("agent schemas", () => {
  it("parses a ranked housing match with a rationale", () => {
    const match = rankedHousingMatchSchema.parse({
      housing: {
        id: "test-1",
        propertyName: "Test Homes",
        address: "123 Main St",
        location: { lat: 41.88, lng: -87.63 },
      },
      routes: [],
      amenities: [],
      schools: [],
      transitStops: [],
      rationale: "Closest walk to work with a grocery store nearby.",
    })
    expect(match.rationale).toContain("grocery")
  })

  it("carries rentUsd and bedrooms so the UI can render pricing directly", () => {
    const match = rankedHousingMatchSchema.parse({
      housing: {
        id: "test-1",
        propertyName: "Test Homes",
        address: "123 Main St",
        location: { lat: 41.88, lng: -87.63 },
      },
      routes: [],
      amenities: [],
      schools: [],
      transitStops: [],
      rentUsd: 1200,
      bedrooms: 2,
      rationale: "Good value for a 2-bedroom.",
    })
    expect(match.rentUsd).toBe(1200)
    expect(match.bedrooms).toBe(2)
  })

  it("parses a full show_map input payload", () => {
    const payload = showMapInputSchema.parse({
      profile: sampleProfile,
      matches: [
        {
          housing: {
            id: "test-1",
            propertyName: "Test Homes",
            address: "123 Main St",
            location: { lat: 41.88, lng: -87.63 },
          },
          routes: [],
          amenities: [],
          schools: [],
          transitStops: [],
          rationale: "Good fit for this household.",
        },
      ],
    })
    expect(payload.matches).toHaveLength(1)
  })
})
