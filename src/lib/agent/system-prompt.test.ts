import { describe, expect, it } from "vitest"

import { AGENT_SYSTEM_PROMPT } from "./system-prompt"

describe("agent system prompt", () => {
  it("always requires the Chicago Housing Authority disclaimer", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain("Chicago Housing Authority")
    expect(AGENT_SYSTEM_PROMPT).toContain("self-reported estimate")
  })

  it("instructs the model to never gate map results on eligibility", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain(
      "Never withhold or filter map results"
    )
  })

  it("instructs the model to keep eligibility answers out of the persisted profile", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain("never persisted beyond this conversation")
  })

  it("treats grocery access and schools with the same rigor as commute, per the Danielle Ochoa persona", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain(
      "Weigh grocery access with the same rigor as the work commute"
    )
    expect(AGENT_SYSTEM_PROMPT).toContain(
      "weigh nearby schools as heavily as commute and rent"
    )
  })

  it("treats no-car as a hard constraint, not a preference", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain(
      "only evaluate walk/bike/transit routes for them, never car"
    )
  })

  it("refuses to fabricate school boundary or safety data it doesn't have", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain("Never claim a specific school attendance boundary")
    expect(AGENT_SYSTEM_PROMPT).toContain("safety")
  })

  it("bounds candidate deep-dives to a shortlist and pushes toward parallel tool calls", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain("shortlist of at most 5 candidates")
    expect(AGENT_SYSTEM_PROMPT).toContain("in parallel")
  })

  it("references every available tool by name", () => {
    for (const toolName of [
      "searchHousingDevelopments",
      "getHousingDetail",
      "computeRoute",
      "nearbyPlaces",
      "assessEligibility",
      "update_profile",
      "show_map",
    ]) {
      expect(AGENT_SYSTEM_PROMPT).toContain(toolName)
    }
  })
})
