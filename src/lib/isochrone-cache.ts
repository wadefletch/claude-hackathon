import type { FeatureCollection, Geometry } from "geojson"

type IsochroneData = FeatureCollection<Geometry>

type IsochroneCacheQuery = {
  coordinates: readonly [number, number]
  mode: string
  minutes: number
}

type IsochroneStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

const ISOCHRONE_CACHE_PREFIX = "qualifind:isochrone:v1:"

export function readCachedIsochrone(
  storage: IsochroneStorage,
  query: IsochroneCacheQuery
): IsochroneData | null {
  const key = getCacheKey(query)
  let serialized: string | null

  try {
    serialized = storage.getItem(key)
  } catch {
    return null
  }
  if (!serialized) return null

  try {
    const data: unknown = JSON.parse(serialized)
    if (isIsochroneData(data)) return data
  } catch {
    // Malformed cached data is evicted below.
  }

  try {
    storage.removeItem(key)
  } catch {
    // Storage access failures should fall through to the API.
  }

  return null
}

export function writeCachedIsochrone(
  storage: IsochroneStorage,
  query: IsochroneCacheQuery,
  data: IsochroneData
): void {
  try {
    storage.setItem(getCacheKey(query), JSON.stringify(data))
  } catch {
    // A full or unavailable localStorage cache must not break map requests.
  }
}

function getCacheKey({
  coordinates,
  mode,
  minutes,
}: IsochroneCacheQuery): string {
  return `${ISOCHRONE_CACHE_PREFIX}${JSON.stringify({ coordinates, mode, minutes })}`
}

function isIsochroneData(value: unknown): value is IsochroneData {
  if (!value || typeof value !== "object") return false

  const candidate = value as Partial<IsochroneData>
  return (
    candidate.type === "FeatureCollection" && Array.isArray(candidate.features)
  )
}
