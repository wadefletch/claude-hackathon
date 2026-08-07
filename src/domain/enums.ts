import { z } from "zod"

/**
 * How a household member can travel from a home to a destination. Drives the
 * multimodal commute comparison and the per-mode route lines drawn on the map.
 *
 * Superset that unifies our original set (car/walk/bike/transit) with the UI's
 * (train/walk/drive/rideshare) from `lib/housing-data.ts`: `train`→`transit`,
 * `drive`→`car`, plus `rideshare`. Use {@link normalizeTransportMode} to map the
 * UI's legacy labels onto this enum.
 */
export const TransportMode = z.enum([
  "transit",
  "walk",
  "bike",
  "car",
  "rideshare",
])
export type TransportMode = z.infer<typeof TransportMode>

/** Legacy UI mode labels (`lib/housing-data.ts`) → canonical {@link TransportMode}. */
export const TRANSPORT_MODE_ALIASES: Record<string, TransportMode> = {
  train: "transit",
  drive: "car",
  transit: "transit",
  walk: "walk",
  bike: "bike",
  car: "car",
  rideshare: "rideshare",
}

/** Coerce any known mode label (ours or the UI's) to a canonical TransportMode. */
export function normalizeTransportMode(mode: string): TransportMode | null {
  return TRANSPORT_MODE_ALIASES[mode] ?? null
}

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
