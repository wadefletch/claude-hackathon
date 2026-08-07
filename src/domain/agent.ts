import { z } from "zod"
import { ProfilePatch, UserProfile } from "./profile"

export { ProfilePatch } from "./profile"

/**
 * JSON Schema for the full profile — the shape the agent reads. Convert once and
 * reuse as a tool/output schema in the (out-of-scope) agent wiring.
 */
export const profileJsonSchema = z.toJSONSchema(UserProfile)

/**
 * JSON Schema for the agent's write contract: the partial patch it emits to
 * update the user's settings. Feed this straight into an Anthropic tool
 * definition's `input_schema`.
 */
export const profilePatchJsonSchema = z.toJSONSchema(ProfilePatch)
