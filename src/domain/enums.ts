import { z } from "zod"

/**
 * How a household member can travel from a home to a destination. Drives the
 * multimodal commute comparison and the per-mode route lines drawn on the map.
 */
export const TransportMode = z.enum(["car", "walk", "bike", "transit"])
export type TransportMode = z.infer<typeof TransportMode>

/**
 * Categories a user can prioritize and that we search for around a housing
 * candidate. `transit` and `schools` double as amenity categories so a single
 * priority list can cover everything the map surfaces.
 */
export const AmenityCategory = z.enum([
  "groceries",
  "laundry",
  "parks",
  "fitness",
  "pharmacy",
  "healthcare",
  "dining",
  "transit",
  "schools",
])
export type AmenityCategory = z.infer<typeof AmenityCategory>
