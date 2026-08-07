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
// estimate: true so consumers know it's not from a real routing API.
const AVERAGE_SPEED_MPH = {
  walk: 3,
  bike: 10,
  transit: 15,
  car: 25,
  rideshare: 22, // similar to car, slightly lower to account for pickup wait
} as const

export type EstimateTravelMode = keyof typeof AVERAGE_SPEED_MPH

export function estimateDurationMinutes(
  distanceMiles: number,
  mode: EstimateTravelMode
): number {
  return Math.round((distanceMiles / AVERAGE_SPEED_MPH[mode]) * 60)
}
