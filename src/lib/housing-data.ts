import { estimateDurationMinutes, haversineMiles } from "@/lib/agent/geo"
import type { EstimateTravelMode, LatLng } from "@/lib/agent/geo"
import { mockHousingDetail } from "@/domain"
import type { HousingDevelopment } from "@/domain"

export type TravelMode = "train" | "walk" | "drive" | "rideshare"
export type Optimizer = "cheapest" | "quickest"

export interface Home {
  id: string
  name: string
  neighborhood: string
  address: string
  rent: number
  beds: number
  coordinates: [number, number]
}

export interface ModeConfig {
  label: string
  // Monthly travel cost is per listing, not per mode: a fixed part that every
  // rider pays (a CTA pass, a downtown parking space) plus a part that scales
  // with how long that particular listing's commute is. Costs assume ~21
  // working days of round trips to the fixed destination.
  baseMonthlyCost: number
  monthlyCostPerCommuteMinute: number
}

export interface HomeResult extends Home {
  mode: TravelMode
  commute: number
  monthlyCost: number
}

export interface ExplorerResult {
  results: HomeResult[]
  mode: TravelMode
  winnerId: string | null
}

export const destination = "The Loop · 200 W Madison St"

// Starts at zero so the slider can be dragged all the way down, even though
// no listing is that cheap — the bottom of the range reads as "nothing under
// this price" rather than as a floor imposed by the data.
export const MIN_RENT = 0
// Real feed rents run 800 + (h % 12) * 75 (see mockHousingDetail in
// src/domain/detail.ts), i.e. up to $1,625, so the ceiling brackets that
// range and the default doesn't silently hide the priciest listings.
export const MAX_RENT = 1700

export const modes: Record<TravelMode, ModeConfig> = {
  // A 30-day CTA pass covers the ride; longer trips add a feeder bus leg.
  train: {
    label: "Train",
    baseMonthlyCost: 75,
    monthlyCostPerCommuteMinute: 0.7,
  },
  // Walking is free no matter how far it is.
  walk: {
    label: "Walk",
    baseMonthlyCost: 0,
    monthlyCostPerCommuteMinute: 0,
  },
  // Downtown parking dominates; fuel and tolls scale with the drive.
  drive: {
    label: "Drive",
    baseMonthlyCost: 240,
    monthlyCostPerCommuteMinute: 4,
  },
  // Almost entirely per-trip, so this scales hardest with distance.
  rideshare: {
    label: "Rideshare",
    baseMonthlyCost: 210,
    monthlyCostPerCommuteMinute: 23,
  },
}

export const homes: Home[] = [
  {
    id: "rogers-park",
    name: "Juneway Court Homes",
    neighborhood: "Rogers Park",
    address: "1660 W Juneway Ter",
    rent: 910,
    beds: 1,
    coordinates: [-87.673, 42.022],
  },
  {
    id: "edgewater",
    name: "Broadway Terrace",
    neighborhood: "Edgewater",
    address: "5858 N Broadway",
    rent: 1040,
    beds: 1,
    coordinates: [-87.66, 41.989],
  },
  {
    id: "albany-park",
    name: "Kedzie Commons",
    neighborhood: "Albany Park",
    address: "4747 N Kedzie Ave",
    rent: 980,
    beds: 2,
    coordinates: [-87.708, 41.968],
  },
  {
    id: "uptown",
    name: "Wilson Yard Residences",
    neighborhood: "Uptown",
    address: "1036 W Wilson Ave",
    rent: 1115,
    beds: 1,
    coordinates: [-87.655, 41.965],
  },
  {
    id: "avondale",
    name: "Belmont Crossing",
    neighborhood: "Avondale",
    address: "3020 N Milwaukee Ave",
    rent: 1085,
    beds: 2,
    coordinates: [-87.718, 41.936],
  },
  {
    id: "logan-square",
    name: "Palmer Square Flats",
    neighborhood: "Logan Square",
    address: "2200 N Kedzie Blvd",
    rent: 1160,
    beds: 1,
    coordinates: [-87.707, 41.921],
  },
  {
    id: "lakeview",
    name: "Ashland Place",
    neighborhood: "Lakeview",
    address: "3150 N Ashland Ave",
    rent: 1210,
    beds: 1,
    coordinates: [-87.668, 41.939],
  },
  {
    id: "humboldt-park",
    name: "Division Street Homes",
    neighborhood: "Humboldt Park",
    address: "3450 W Division St",
    rent: 950,
    beds: 2,
    coordinates: [-87.713, 41.903],
  },
  {
    id: "west-town",
    name: "Noble Square Court",
    neighborhood: "West Town",
    address: "1450 W Chicago Ave",
    rent: 1250,
    beds: 1,
    coordinates: [-87.664, 41.896],
  },
  {
    id: "near-west",
    name: "Madison Row",
    neighborhood: "Near West Side",
    address: "2100 W Madison St",
    rent: 1185,
    beds: 2,
    coordinates: [-87.679, 41.881],
  },
  {
    id: "loop",
    name: "Dearborn Studios",
    neighborhood: "The Loop",
    address: "520 S Dearborn St",
    rent: 1340,
    beds: 0,
    coordinates: [-87.629, 41.875],
  },
  {
    id: "bronzeville",
    name: "Prairie Shores Annex",
    neighborhood: "Bronzeville",
    address: "3001 S King Dr",
    rent: 1060,
    beds: 2,
    coordinates: [-87.616, 41.84],
  },
  {
    id: "little-village",
    name: "Cermak Courts",
    neighborhood: "Little Village",
    address: "2750 W Cermak Rd",
    rent: 930,
    beds: 2,
    coordinates: [-87.694, 41.852],
  },
  {
    id: "englewood",
    name: "Halsted Green Homes",
    neighborhood: "Englewood",
    address: "6300 S Halsted St",
    rent: 875,
    beds: 2,
    coordinates: [-87.645, 41.779],
  },
  {
    id: "hyde-park",
    name: "Woodlawn Avenue Flats",
    neighborhood: "Hyde Park",
    address: "5500 S Woodlawn Ave",
    rent: 1095,
    beds: 1,
    coordinates: [-87.596, 41.795],
  },
  {
    id: "south-shore",
    name: "Rainbow Beach Court",
    neighborhood: "South Shore",
    address: "7500 S South Shore Dr",
    rent: 895,
    beds: 2,
    coordinates: [-87.552, 41.76],
  },
]

// Maps the explorer's TravelMode onto the geo model's mode vocabulary.
const TRAVEL_MODE_TO_ESTIMATE_MODE: Record<TravelMode, EstimateTravelMode> = {
  train: "transit",
  walk: "walk",
  drive: "car",
  rideshare: "rideshare",
}

export function commuteFor(home: Home, mode: TravelMode, work: LatLng = LOOP) {
  const homeLocation: LatLng = {
    lat: home.coordinates[1],
    lng: home.coordinates[0],
  }
  const miles = haversineMiles(homeLocation, work)
  return estimateDurationMinutes(miles, TRAVEL_MODE_TO_ESTIMATE_MODE[mode])
}

// What this listing costs to commute from, per month, scaled by how long the
// trip to `work` actually takes.
export function monthlyCostFor(
  home: Home,
  mode: TravelMode,
  work: LatLng = LOOP
) {
  const { baseMonthlyCost, monthlyCostPerCommuteMinute } = modes[mode]
  const cost =
    baseMonthlyCost + monthlyCostPerCommuteMinute * commuteFor(home, mode, work)
  return Math.round(cost / 5) * 5
}

export interface ExplorerQuery {
  maxMinutes: number
  maxRent: number
  work: LatLng
  // Defaults to the built-in fixtures so existing callers/tests keep working;
  // the live explorer passes real developments instead.
  homeList?: Home[]
}

function reachable(mode: TravelMode, query: ExplorerQuery): HomeResult[] {
  const { maxMinutes, maxRent, work, homeList = homes } = query
  return homeList
    .map((home) => ({
      ...home,
      mode,
      commute: commuteFor(home, mode, work),
      monthlyCost: monthlyCostFor(home, mode, work),
    }))
    .filter((home) => home.commute <= maxMinutes && home.rent <= maxRent)
}

export function getManualResults(
  mode: TravelMode,
  query: ExplorerQuery
): ExplorerResult {
  const results = reachable(mode, query).sort(
    (a, b) => a.commute - b.commute || a.rent - b.rent
  )
  return { results, mode, winnerId: null }
}

export function getOptimizedResults(
  optimizer: Optimizer,
  query: ExplorerQuery
): ExplorerResult {
  const mode: TravelMode = optimizer === "cheapest" ? "train" : "rideshare"
  const candidates = reachable(mode, query)
  const winner = [...candidates]
    .sort((a, b) =>
      optimizer === "cheapest"
        ? a.rent - b.rent || a.commute - b.commute
        : a.commute - b.commute || a.rent - b.rent
    )
    .at(0)
  return {
    results: winner ? [winner] : [],
    mode,
    winnerId: winner?.id ?? null,
  }
}

// The Loop, used as the default work location if a caller doesn't have a
// real one yet.
export const LOOP: LatLng = { lat: 41.882, lng: -87.633 }

/**
 * Map real Chicago affordable-housing developments into the `Home` shape the
 * explorer already renders. The feed has location/name/address; rent and beds
 * are estimated (mock rent/beds from `mockHousingDetail`). Commute times are
 * computed on demand from `coordinates` against the caller's real work
 * location via `commuteFor`.
 */
export function buildHomesFromDevelopments(
  developments: HousingDevelopment[]
): Home[] {
  return developments.map((development) => {
    const detail = mockHousingDetail(development.id)
    return {
      id: development.id,
      name: development.propertyName,
      neighborhood: development.communityArea ?? "Chicago",
      address: development.address,
      rent: detail.rentUsd ?? 1000,
      beds: detail.beds ?? 1,
      coordinates: [development.location.lng, development.location.lat],
    }
  })
}
