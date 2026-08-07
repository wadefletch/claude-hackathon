import { z } from "zod"

/** A labeled key/value shown in the neighborhood card (matches the UI). */
export const NeighborhoodFact = z.object({
  label: z.string(),
  value: z.string(),
})
export type NeighborhoodFact = z.infer<typeof NeighborhoodFact>

/**
 * Qualitative neighborhood profile behind the detail card's "neighborhood" tab.
 * Mirrors the UI's `NeighborhoodSnapshot` (`lib/neighborhood-data.ts`).
 *
 * `transit`/`essentials` are free-text today; they can later be generated from
 * structured `TransitStop`/`Amenity` results instead of hardcoded strings.
 */
export const Neighborhood = z.object({
  id: z.string().optional(), // community area / neighborhood slug
  name: z.string().optional(),
  overview: z.string(),
  transit: z.array(z.string()),
  essentials: z.array(z.string()),
  facts: z.array(NeighborhoodFact),
})
export type Neighborhood = z.infer<typeof Neighborhood>
