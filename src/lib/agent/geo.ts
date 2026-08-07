export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_MILES = 3958.8
const METERS_PER_MILE = 1609.34

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h))
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  return haversineMiles(a, b) * METERS_PER_MILE
}

// Straight-line-distance-based estimate used until a real routing provider
// (Route.provider) is wired in — every Route produced this way sets
// estimate: true so consumers know it's not from a real routing API. When a
// provider (e.g. a real transit/directions API) is wired in, it should
// replace this whole model and set estimate: false with actual path/route
// data instead of straight-line distance.
//
// Straight-line distance understates real travel distance because streets
// and rail lines aren't straight, so we inflate it by a detour factor before
// converting to time. Chicago's street grid runs close to true north/south
// and east/west, adding roughly 25% to straight-line distance for a typical
// trip.
const NETWORK_DETOUR_FACTOR = 1.25

// Per-mode in-vehicle speed plus a fixed number of minutes that doesn't scale
// with distance: walking to a stop/car, waiting, parking, etc. Transit's
// fixed overhead (walk to the stop + wait for the next vehicle) is the
// biggest of these and is what the old model was missing entirely.
const MODE_PARAMS = {
  walk: { mph: 3, fixedMinutes: 0 },
  bike: { mph: 10, fixedMinutes: 2 }, // unlock/park
  transit: { mph: 17, fixedMinutes: 12 }, // walk to stop + wait
  car: { mph: 22, fixedMinutes: 5 }, // parking + last walk
  rideshare: { mph: 22, fixedMinutes: 5 }, // pickup wait
} as const

export type EstimateTravelMode = keyof typeof MODE_PARAMS

export function estimateDurationMinutes(
  distanceMiles: number,
  mode: EstimateTravelMode
): number {
  const { mph, fixedMinutes } = MODE_PARAMS[mode]
  const networkMiles = distanceMiles * NETWORK_DETOUR_FACTOR
  return Math.round((networkMiles / mph) * 60 + fixedMinutes)
}
