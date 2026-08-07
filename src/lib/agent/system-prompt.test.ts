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
