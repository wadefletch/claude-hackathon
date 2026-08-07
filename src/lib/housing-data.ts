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
  trainMinutes: number
}

export interface ModeConfig {
  label: string
  factor: number
  monthlyCost: number
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

export const MIN_RENT = 800
export const MAX_RENT = 1400

export const modes: Record<TravelMode, ModeConfig> = {
  train: { label: "Train", factor: 1, monthlyCost: 75 },
  walk: { label: "Walk", factor: 2.4, monthlyCost: 0 },
  drive: { label: "Drive", factor: 0.78, monthlyCost: 310 },
  rideshare: { label: "Rideshare", factor: 0.68, monthlyCost: 640 },
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
    trainMinutes: 47,
  },
  {
    id: "edgewater",
    name: "Broadway Terrace",
    neighborhood: "Edgewater",
    address: "5858 N Broadway",
    rent: 1040,
    beds: 1,
    coordinates: [-87.66, 41.989],
    trainMinutes: 38,
  },
  {
    id: "albany-park",
    name: "Kedzie Commons",
    neighborhood: "Albany Park",
    address: "4747 N Kedzie Ave",
    rent: 980,
    beds: 2,
    coordinates: [-87.708, 41.968],
    trainMinutes: 37,
  },
  {
    id: "uptown",
    name: "Wilson Yard Residences",
    neighborhood: "Uptown",
    address: "1036 W Wilson Ave",
    rent: 1115,
    beds: 1,
    coordinates: [-87.655, 41.965],
    trainMinutes: 31,
  },
  {
    id: "avondale",
    name: "Belmont Crossing",
    neighborhood: "Avondale",
    address: "3020 N Milwaukee Ave",
    rent: 1085,
    beds: 2,
    coordinates: [-87.718, 41.936],
    trainMinutes: 29,
  },
  {
    id: "logan-square",
    name: "Palmer Square Flats",
    neighborhood: "Logan Square",
    address: "2200 N Kedzie Blvd",
    rent: 1160,
    beds: 1,
    coordinates: [-87.707, 41.921],
    trainMinutes: 25,
  },
  {
    id: "lakeview",
    name: "Ashland Place",
    neighborhood: "Lakeview",
    address: "3150 N Ashland Ave",
    rent: 1210,
    beds: 1,
    coordinates: [-87.668, 41.939],
    trainMinutes: 28,
  },
  {
    id: "humboldt-park",
    name: "Division Street Homes",
    neighborhood: "Humboldt Park",
    address: "3450 W Division St",
    rent: 950,
    beds: 2,
    coordinates: [-87.713, 41.903],
    trainMinutes: 34,
  },
  {
    id: "west-town",
    name: "Noble Square Court",
    neighborhood: "West Town",
    address: "1450 W Chicago Ave",
    rent: 1250,
    beds: 1,
    coordinates: [-87.664, 41.896],
    trainMinutes: 19,
  },
  {
    id: "near-west",
    name: "Madison Row",
    neighborhood: "Near West Side",
    address: "2100 W Madison St",
    rent: 1185,
    beds: 2,
    coordinates: [-87.679, 41.881],
    trainMinutes: 16,
  },
  {
    id: "loop",
    name: "Dearborn Studios",
    neighborhood: "The Loop",
    address: "520 S Dearborn St",
    rent: 1340,
    beds: 0,
    coordinates: [-87.629, 41.875],
    trainMinutes: 8,
  },
  {
    id: "bronzeville",
    name: "Prairie Shores Annex",
    neighborhood: "Bronzeville",
    address: "3001 S King Dr",
    rent: 1060,
    beds: 2,
    coordinates: [-87.616, 41.84],
    trainMinutes: 23,
  },
  {
    id: "little-village",
    name: "Cermak Courts",
    neighborhood: "Little Village",
    address: "2750 W Cermak Rd",
    rent: 930,
    beds: 2,
    coordinates: [-87.694, 41.852],
    trainMinutes: 30,
  },
  {
    id: "englewood",
    name: "Halsted Green Homes",
    neighborhood: "Englewood",
    address: "6300 S Halsted St",
    rent: 875,
    beds: 2,
    coordinates: [-87.645, 41.779],
    trainMinutes: 42,
  },
  {
    id: "hyde-park",
    name: "Woodlawn Avenue Flats",
    neighborhood: "Hyde Park",
    address: "5500 S Woodlawn Ave",
    rent: 1095,
    beds: 1,
    coordinates: [-87.596, 41.795],
    trainMinutes: 34,
  },
  {
    id: "south-shore",
    name: "Rainbow Beach Court",
    neighborhood: "South Shore",
    address: "7500 S South Shore Dr",
    rent: 895,
    beds: 2,
    coordinates: [-87.552, 41.76],
    trainMinutes: 49,
  },
]

export function commuteFor(home: Home, mode: TravelMode) {
  return Math.round(home.trainMinutes * modes[mode].factor)
}

function reachable(
  mode: TravelMode,
  maxMinutes: number,
  maxRent: number
): HomeResult[] {
  return homes
    .map((home) => ({
      ...home,
      mode,
      commute: commuteFor(home, mode),
      monthlyCost: modes[mode].monthlyCost,
    }))
    .filter((home) => home.commute <= maxMinutes && home.rent <= maxRent)
}

export function getManualResults(
  mode: TravelMode,
  maxMinutes: number,
  maxRent: number
): ExplorerResult {
  const results = reachable(mode, maxMinutes, maxRent).sort(
    (a, b) => a.commute - b.commute || a.rent - b.rent
  )
  return { results, mode, winnerId: null }
}

export function getOptimizedResults(
  optimizer: Optimizer,
  maxMinutes: number,
  maxRent: number
): ExplorerResult {
  const mode: TravelMode = optimizer === "cheapest" ? "train" : "rideshare"
  const candidates = reachable(mode, maxMinutes, maxRent)
  const winner = [...candidates]
    .sort((a, b) =>
      optimizer === "cheapest"
        ? a.rent - b.rent || a.commute - b.commute
        : a.commute - b.commute || a.rent - b.rent
    )
    .at(0)
  // The rent filter can exclude every candidate, so there may be no winner.
  if (!winner) return { results: [], mode, winnerId: null }
  return { results: [winner], mode, winnerId: winner.id }
}
