import { z } from "zod"
import { AmenityCategory } from "./enums"
import { WorkLocation } from "./location"

/**
 * One person in the household. Adults may carry a `work` location (drives
 * commute routing); children may be `schoolAge` (drives school proximity).
 */
export const HouseholdMember = z.object({
  id: z.string(),
  role: z.enum(["adult", "child"]),
  name: z.string().optional(),
  ageBand: z.enum(["0-4", "5-11", "12-14", "15-18", "adult"]).optional(),
  schoolAge: z.boolean().optional(),
  work: WorkLocation.optional(),
})
export type HouseholdMember = z.infer<typeof HouseholdMember>

/**
 * A weighted preference. `weight` 1 (nice-to-have) → 5 (critical); the matching
 * logic (out of scope here) will use these to rank housing candidates.
 */
export const Priority = z.object({
  category: AmenityCategory,
  weight: z.number().int().min(1).max(5),
})
export type Priority = z.infer<typeof Priority>

/** Hard-ish constraints on the housing itself (budget, size, accessibility). */
export const HousingNeeds = z.object({
  bedroomsNeeded: z.number().int().min(0).optional(),
  maxRentUsd: z.number().positive().optional(),
  monthlyIncomeUsd: z.number().positive().optional(),
  accessibility: z.boolean().optional(),
  pets: z.boolean().optional(),
  preferredPropertyTypes: z.array(z.string()).optional(),
  preferredCommunityAreas: z.array(z.string()).optional(),
})
export type HousingNeeds = z.infer<typeof HousingNeeds>

/**
 * The single source of truth configured in the left panel and read/written by
 * the agent. Passed as plain JSON to both the agent and the UI.
 */
export const UserProfile = z.object({
  id: z.string(),
  members: z.array(HouseholdMember).min(1),
  priorities: z.array(Priority),
  housingNeeds: HousingNeeds,
})
export type UserProfile = z.infer<typeof UserProfile>

/**
 * The agent's update contract: a partial profile the agent emits to mutate
 * settings ("show me places near a park with 3 bedrooms"). Applied on top of the
 * current profile by the (out-of-scope) reducer. Deep-partial so nested objects
 * like `housingNeeds` can be patched field-by-field.
 */
export const ProfilePatch = z.object({
  members: z.array(HouseholdMember).min(1).optional(),
  priorities: z.array(Priority).optional(),
  housingNeeds: HousingNeeds.partial().optional(),
})
export type ProfilePatch = z.infer<typeof ProfilePatch>
