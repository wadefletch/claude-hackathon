import { z } from "zod"
import { TransportMode } from "./enums"

/**
 * Shared value object for anything with a position. `lat`/`lng` are WGS84
 * degrees (note: GeoJSON serializes as [lng, lat] — see geojson.ts).
 */
export const Location = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  label: z.string().optional(),
  communityArea: z.string().optional(),
  zip: z.string().optional(),
})
export type Location = z.infer<typeof Location>

/**
 * Where a household member works, plus how they prefer to get there. Origin of
 * the commute comparison: routes are computed from each housing candidate to
 * this location across transport modes.
 */
export const WorkLocation = Location.extend({
  employer: z.string().optional(),
  preferredMode: TransportMode,
  maxCommuteMinutes: z.number().int().positive().optional(),
})
export type WorkLocation = z.infer<typeof WorkLocation>
