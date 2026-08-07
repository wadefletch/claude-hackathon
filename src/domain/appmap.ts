import type { Amenity } from "./amenity"
import type { HousingDevelopment } from "./housing"
import type { Location } from "./location"

/**
 * Shape the real-geo map (`components/app-map.tsx`) consumes. Redeclared here
 * (not imported) to keep the dependency arrow pointing components → domain, and
 * because it uses GeoJSON [lng, lat] tuples rather than our {lat, lng} objects.
 */
export interface AppMapLocation {
  label: string
  coordinates: [number, number] // [lng, lat]
}

/** Any {lat, lng} + label → an AppMapLocation ([lng, lat] tuple). */
export function toAppMapLocation(
  point: { lat: number; lng: number },
  label: string
): AppMapLocation {
  return { label, coordinates: [point.lng, point.lat] }
}

/** A housing development → AppMapLocation (labeled by property name). */
export function housingToAppMapLocation(
  home: HousingDevelopment
): AppMapLocation {
  return toAppMapLocation(home.location, home.propertyName)
}

/** An amenity → AppMapLocation (labeled by amenity name). */
export function amenityToAppMapLocation(amenity: Amenity): AppMapLocation {
  return toAppMapLocation(amenity.location, amenity.name)
}

/** A generic Location → AppMapLocation (labeled by its `label`/`address`). */
export function locationToAppMapLocation(location: Location): AppMapLocation {
  return toAppMapLocation(location, location.label ?? location.address ?? "")
}
