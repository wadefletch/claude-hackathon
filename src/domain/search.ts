import { z } from "zod"
import { TransportMode } from "./enums"

/**
 * Auto-optimization target for the search, from the UI's HousingExplorer.
 * `cheapest` minimizes total cost (rent + transport), `quickest` minimizes
 * commute time. Bridges to the reserved `score`/`scoreBreakdown` on HousingMatch.
 */
export const Optimizer = z.enum(["cheapest", "quickest"])
export type Optimizer = z.infer<typeof Optimizer>

/**
 * Transient search controls (not part of the persisted profile). Mirrors the
 * HousingExplorer's `maxMinutes` / `manualMode` / `optimizer` state so the two
 * UIs can share one shape. When `optimizer` is set it overrides `mode`.
 */
export const SearchPreferences = z.object({
  maxCommuteMinutes: z.number().int().positive().optional(),
  mode: TransportMode.optional(),
  optimizer: Optimizer.nullable().optional(),
})
export type SearchPreferences = z.infer<typeof SearchPreferences>
