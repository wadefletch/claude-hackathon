import { z } from "zod"
import { TransportMode } from "./enums"

/**
 * A computed route from a housing candidate to a destination. Provider-agnostic:
 * a real routing API (e.g. Google Routes) fills these in with `estimate:false`;
 * a haversine fallback yields rough numbers with `estimate:true`.
 *
 * One entity powers two UI features:
 *  - commute comparison: many rows, `purpose:"work"`, one per {@link TransportMode}
 *  - map lines on pin click: routes to work, groceries, school, etc.
 */
export const Route = z.object({
  housingId: z.string(), // origin (HousingDevelopment.id)
  purpose: z.enum(["work", "amenity", "school"]),
  destinationId: z.string(), // memberId | amenityId | schoolId
  destinationLabel: z.string().optional(),
  mode: TransportMode,
  durationMinutes: z.number(),
  distanceMeters: z.number().optional(),
  monthlyCostUsd: z.number().optional(), // recurring cost of this mode (fares, gas, rideshare)
  transfers: z.number().optional(), // transit only
  geometry: z.any().optional(), // GeoJSON LineString for drawing on the map
  estimate: z.boolean(), // true = haversine fallback, false = real routing
  provider: z.string().optional(),
})
export type Route = z.infer<typeof Route>
