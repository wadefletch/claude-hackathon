import { describe, expect, it } from "vitest"

import { agentTools } from "./tools"

// The AI SDK's `tool()` execute signature takes (input, callOptions). These
// tests only exercise business logic, so callOptions is stubbed.
const CALL_OPTIONS = { toolCallId: "test-call", messages: [] } as any

// `execute` is typed to allow returning an AsyncIterable for streamed
// partial results. None of these tools do that — they always resolve a
// plain value — so this narrows the type back for the tests.
async function exec<T>(result: T | AsyncIterable<T>): Promise<T> {
  return result as T
}

describe("agent tools", () => {
  it("searchHousingDevelopments defaults to a small limit so the agent can't accidentally deep-dive dozens of candidates", () => {
    const parsed = (agentTools.searchHousingDevelopments.inputSchema as any).parse({})
    expect(parsed.limit).toBeLessThanOrEqual(15)
  })

  it(
    "searchHousingDevelopments returns real, geocoded Chicago developments",
    async () => {
      const results = await exec(
        agentTools.searchHousingDevelopments.execute({ limit: 5 }, CALL_OPTIONS)
      )
      expect(results.length).toBeGreaterThan(0)
      for (const development of results) {
        expect(development.propertyName.length).toBeGreaterThan(0)
        expect(Number.isFinite(development.location.lat)).toBe(true)
        expect(Number.isFinite(development.location.lng)).toBe(true)
      }
    },
    15_000
  )

  it("getHousingDetail returns a mocked rent range and reviews", async () => {
    const detail = await exec(
      agentTools.getHousingDetail.execute({ housingId: "test-1" }, CALL_OPTIONS)
    )
    expect(detail.rentRangeUsd).toBeDefined()
    expect(detail.reviews?.length).toBeGreaterThan(0)
    expect(detail.isMock).toBe(true)
  })

  it("computeRoute estimates a longer duration for walking than driving", async () => {
    const origin = { lat: 41.8825, lng: -87.6339 }
    const destination = { lat: 41.7943, lng: -87.5907 }
    const walk = await exec(
      agentTools.computeRoute.execute(
        {
          housingId: "test-1",
          origin,
          destination,
          purpose: "work",
          destinationId: "member-1",
          mode: "walk",
        },
        CALL_OPTIONS
      )
    )
    const car = await exec(
      agentTools.computeRoute.execute(
        {
          housingId: "test-1",
          origin,
          destination,
          purpose: "work",
          destinationId: "member-1",
          mode: "car",
        },
        CALL_OPTIONS
      )
    )
    expect(walk.durationMinutes).toBeGreaterThan(car.durationMinutes)
    expect(walk.estimate).toBe(true)
  })

  it("nearbyPlaces only returns places within the radius", async () => {
    const near = await exec(
      agentTools.nearbyPlaces.execute(
        { lat: 41.9294, lng: -87.7073, radiusMeters: 500 },
        CALL_OPTIONS
      )
    )
    const far = await exec(
      agentTools.nearbyPlaces.execute(
        { lat: 41.9294, lng: -87.7073, radiusMeters: 1 },
        CALL_OPTIONS
      )
    )
    expect(far.amenities.length).toBeLessThanOrEqual(near.amenities.length)
  })

  it("assessEligibility places the Danielle Ochoa persona (single mother, $40,600/yr, household of 2) above extremely-low but not comfortably above the AMI limits", async () => {
    const result = await exec(
      agentTools.assessEligibility.execute(
        { annualHouseholdIncome: 40_600, householdSize: 2 },
        CALL_OPTIONS
      )
    )
    expect(result.amiTier).not.toBe("extremely-low")
    expect(result.amiTier).not.toBe("above-low-income")
  })

  it("assessEligibility classifies a low-income household as extremely-low", async () => {
    const result = await exec(
      agentTools.assessEligibility.execute(
        { annualHouseholdIncome: 20000, householdSize: 4 },
        CALL_OPTIONS
      )
    )
    expect(result.amiTier).toBe("extremely-low")
  })

  it("assessEligibility classifies a high-income household as above-low-income", async () => {
    const result = await exec(
      agentTools.assessEligibility.execute(
        { annualHouseholdIncome: 250000, householdSize: 4 },
        CALL_OPTIONS
      )
    )
    expect(result.amiTier).toBe("above-low-income")
    expect(result.eligiblePrograms).toEqual([])
  })

  it("update_profile echoes back the patch it's given", async () => {
    const patch = { housingNeeds: { maxRentUsd: 1200 } }
    const result = await exec(
      agentTools.update_profile.execute(patch, CALL_OPTIONS)
    )
    expect(result).toEqual(patch)
  })

  it("show_map echoes back the payload it's given", async () => {
    const payload = {
      profile: {
        id: "p1",
        members: [{ id: "m1", role: "adult" as const }],
        priorities: [],
        housingNeeds: {},
      },
      matches: [],
    }
    const result = await exec(
      agentTools.show_map.execute(payload, CALL_OPTIONS)
    )
    expect(result.matches).toEqual([])
  })
})
