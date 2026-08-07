import { Amenity, School, TransitStop } from "@/domain"

// No real feed is wired up yet for groceries/parks/schools/transit (OSM
// Overpass, CPS school locations, and CTA GTFS per the data plan). This is
// placeholder coverage around a few Chicago neighborhoods so the agent has
// something real-shaped to reason over until those land.
export const FIXTURE_AMENITIES: Amenity[] = [
  Amenity.parse({
    id: "loop-grocery",
    category: "groceries",
    name: "Loop Fresh Market",
    location: { lat: 41.8802, lng: -87.6314, communityArea: "Loop" },
    source: "chicago-open-data",
  }),
  Amenity.parse({
    id: "logan-square-grocery",
    category: "groceries",
    name: "Milwaukee Ave Grocer",
    location: { lat: 41.9298, lng: -87.7069, communityArea: "Logan Square" },
    source: "osm",
  }),
  Amenity.parse({
    id: "hyde-park-grocery",
    category: "groceries",
    name: "53rd Street Market",
    location: { lat: 41.7996, lng: -87.5934, communityArea: "Hyde Park" },
    source: "osm",
  }),
  Amenity.parse({
    id: "logan-square-park",
    category: "parks",
    name: "Logan Square Park",
    location: { lat: 41.9294, lng: -87.7076, communityArea: "Logan Square" },
    source: "chicago-open-data",
  }),
  Amenity.parse({
    id: "humboldt-park",
    category: "parks",
    name: "Humboldt Park",
    location: { lat: 41.9034, lng: -87.7018, communityArea: "Humboldt Park" },
    source: "chicago-open-data",
  }),
  Amenity.parse({
    id: "avondale-pharmacy",
    category: "pharmacy",
    name: "Milwaukee Ave Pharmacy",
    location: { lat: 41.9386, lng: -87.7115, communityArea: "Avondale" },
    source: "osm",
  }),
]

export const FIXTURE_SCHOOLS: School[] = [
  School.parse({
    id: "avondale-elementary",
    name: "Avondale-Logandale Elementary",
    grades: "PK-8",
    type: "public",
    location: { lat: 41.9398, lng: -87.7123, communityArea: "Avondale" },
  }),
  School.parse({
    id: "kenwood-academy",
    name: "Kenwood Academy",
    grades: "7-12",
    type: "public",
    location: { lat: 41.8047, lng: -87.5924, communityArea: "Hyde Park" },
  }),
  School.parse({
    id: "ogden-international",
    name: "Ogden International School",
    grades: "PK-12",
    type: "public",
    location: { lat: 41.8845, lng: -87.6389, communityArea: "Near North Side" },
  }),
]

export const FIXTURE_TRANSIT_STOPS: TransitStop[] = [
  TransitStop.parse({
    id: "logan-square-blue-line",
    name: "Logan Square",
    kind: "train",
    lines: ["Blue Line"],
    location: { lat: 41.9294, lng: -87.7073, communityArea: "Logan Square" },
  }),
  TransitStop.parse({
    id: "clark-lake",
    name: "Clark/Lake",
    kind: "train",
    lines: ["Blue Line", "Green Line", "Orange Line", "Brown Line", "Purple Line", "Pink Line"],
    location: { lat: 41.8858, lng: -87.6307, communityArea: "Loop" },
  }),
  TransitStop.parse({
    id: "55th-garfield-green-line",
    name: "Garfield",
    kind: "train",
    lines: ["Green Line"],
    location: { lat: 41.7947, lng: -87.6255, communityArea: "Washington Park" },
  }),
]

// Placeholder Chicago-area AMI figures. NOT verified against a current HUD
// publication — docs/superpowers/specs/2026-08-07-agent-design.md flags
// getting the real numbers as a dependency on Lydia. The household-size
// scaling factors themselves are HUD's standard methodology and are not
// the placeholder part; only BASE_100_PCT_AMI_FOR_FOUR is a guess.
const BASE_100_PCT_AMI_FOR_FOUR = 103_000
const HOUSEHOLD_SIZE_FACTOR: Record<number, number> = {
  1: 0.7,
  2: 0.8,
  3: 0.9,
  4: 1.0,
  5: 1.08,
  6: 1.16,
  7: 1.24,
  8: 1.32,
}

export function amiLimitForHouseholdSize(householdSize: number): number {
  const size = Math.min(Math.max(Math.round(householdSize), 1), 8)
  return Math.round(BASE_100_PCT_AMI_FOR_FOUR * HOUSEHOLD_SIZE_FACTOR[size])
}
