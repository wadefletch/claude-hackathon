import type { Amenity, School, TransitStop } from "./amenity"
import type { HousingDevelopment } from "./housing"
import type { Route } from "./route"

/**
 * Minimal GeoJSON types (avoids pulling in @types/geojson). Coordinates are
 * [longitude, latitude] per the GeoJSON spec — the opposite order of our
 * Location {lat, lng}. The helpers below handle that swap so callers don't have to.
 */
export type Position = [number, number]
export interface PointFeature<TProps> {
  type: "Feature"
  geometry: { type: "Point"; coordinates: Position }
  properties: TProps
}
export interface LineStringFeature<TProps> {
  type: "Feature"
  geometry: { type: "LineString"; coordinates: Position[] }
  properties: TProps
}
export interface FeatureCollection<TFeature> {
  type: "FeatureCollection"
  features: TFeature[]
}

/**
 * Generic point FeatureCollection builder. `getCoords` returns {lat, lng} and
 * this emits GeoJSON [lng, lat]. `getProps` picks what rides along for styling
 * and popups.
 */
export function toFeatureCollection<T, TProps>(
  items: T[],
  getCoords: (item: T) => { lat: number; lng: number },
  getProps: (item: T) => TProps
): FeatureCollection<PointFeature<TProps>> {
  return {
    type: "FeatureCollection",
    features: items.map((item) => {
      const { lat, lng } = getCoords(item)
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: getProps(item),
      }
    }),
  }
}

/** Housing developments → point features (properties = the whole development). */
export function housingToFeatureCollection(items: HousingDevelopment[]) {
  return toFeatureCollection(
    items,
    (h) => h.location,
    (h) => h
  )
}

/** Amenities → point features. */
export function amenitiesToFeatureCollection(items: Amenity[]) {
  return toFeatureCollection(
    items,
    (a) => a.location,
    (a) => a
  )
}

/** Schools → point features. */
export function schoolsToFeatureCollection(items: School[]) {
  return toFeatureCollection(
    items,
    (s) => s.location,
    (s) => s
  )
}

/** Transit stops → point features. */
export function transitStopsToFeatureCollection(items: TransitStop[]) {
  return toFeatureCollection(
    items,
    (t) => t.location,
    (t) => t
  )
}

/**
 * Routes with geometry → LineString features for drawing on the map. Routes
 * without geometry (e.g. haversine estimates) are skipped. Route geometry is
 * assumed to already be in GeoJSON [lng, lat] order as returned by the provider.
 */
export function routesToFeatureCollection(
  routes: Route[]
): FeatureCollection<LineStringFeature<Omit<Route, "geometry">>> {
  const features: LineStringFeature<Omit<Route, "geometry">>[] = []
  for (const route of routes) {
    const geometry = route.geometry as
      { type?: string; coordinates?: Position[] } | undefined
    if (!geometry?.coordinates || geometry.type !== "LineString") continue
    const { geometry: _omit, ...props } = route
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: geometry.coordinates },
      properties: props,
    })
  }
  return { type: "FeatureCollection", features }
}
