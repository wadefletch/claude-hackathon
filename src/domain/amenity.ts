import { z } from "zod"
import { AmenityCategory } from "./enums"
import { Location } from "./location"

/**
 * A point of interest near a housing candidate (grocery, park, gym, ...).
 * `distanceMeters`, when present, is measured from a specific housing candidate.
 */
export const Amenity = z.object({
  id: z.string(),
  category: AmenityCategory,
  name: z.string(),
  location: Location,
  source: z.enum(["chicago-open-data", "osm", "places"]),
  distanceMeters: z.number().optional(),
})
export type Amenity = z.infer<typeof Amenity>

/** A CPS school, surfaced for households with school-age children. */
export const School = z.object({
  id: z.string(),
  name: z.string(),
  grades: z.string().optional(), // e.g. "PK-8", "9-12"
  type: z.string().optional(), // e.g. "Elementary", "High School", "Charter"
  location: Location,
  distanceMeters: z.number().optional(),
})
export type School = z.infer<typeof School>

/** A CTA stop, for the "walk to transit" signal near a housing candidate. */
export const TransitStop = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["train", "bus"]),
  lines: z.array(z.string()).optional(), // e.g. ["Blue", "Red"] or bus routes
  location: Location,
  walkMeters: z.number().optional(),
})
export type TransitStop = z.infer<typeof TransitStop>
