import { z } from "zod"
import { Amenity, School, TransitStop } from "./amenity"
import { HousingDevelopment } from "./housing"
import { Route } from "./route"

/**
 * The join surface the agent reasons over and the UI renders/maps: one candidate
 * development plus everything computed for the current profile. `score` and
 * `scoreBreakdown` are reserved for the (out-of-scope) ranking logic.
 */
export const HousingMatch = z.object({
  housing: HousingDevelopment,
  routes: z.array(Route),
  amenities: z.array(Amenity),
  schools: z.array(School),
  transitStops: z.array(TransitStop),
  score: z.number().optional(), // RESERVED — matching logic not implemented here
  scoreBreakdown: z.record(z.string(), z.number()).optional(), // per-priority contributions
})
export type HousingMatch = z.infer<typeof HousingMatch>
