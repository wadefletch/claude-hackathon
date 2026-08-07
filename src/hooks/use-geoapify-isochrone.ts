import { useQuery } from "@tanstack/react-query"
import type { FeatureCollection, Geometry } from "geojson"

export type IsochroneMode = "drive" | "transit"

type IsochroneQuery = {
  coordinates: [number, number]
  mode: IsochroneMode
  minutes: number
}

type IsochroneData = FeatureCollection<Geometry>
type GeoapifyIsochroneResponse = IsochroneData & {
  properties?: { id?: string }
}

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY

export function useGeoapifyIsochrone(query?: IsochroneQuery) {
  return useQuery({
    queryKey: [
      "geoapify",
      "isochrone",
      query?.coordinates,
      query?.mode,
      query?.minutes,
    ],
    queryFn: ({ signal }) => {
      if (!query || !GEOAPIFY_API_KEY) {
        throw new Error("Geoapify isochrone query is not configured")
      }

      return fetchIsochrone(query, GEOAPIFY_API_KEY, signal)
    },
    enabled:
      typeof window !== "undefined" &&
      Boolean(query?.minutes && GEOAPIFY_API_KEY),
    placeholderData: (previousData) => previousData,
    staleTime: Infinity,
    retry: false,
  })
}

async function fetchIsochrone(
  { coordinates: [longitude, latitude], mode, minutes }: IsochroneQuery,
  apiKey: string,
  signal: AbortSignal
): Promise<IsochroneData> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    type: "time",
    mode,
    range: String(minutes * 60),
    apiKey,
  })
  let url = `https://api.geoapify.com/v1/isoline?${params}`

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, { signal })
    const data = (await response.json()) as GeoapifyIsochroneResponse

    if (response.ok && response.status !== 202) return data

    const requestId = data.properties?.id
    if (response.status !== 202 || !requestId) {
      throw new Error(`Geoapify returned ${response.status}`)
    }

    await wait(1000, signal)
    url = `https://api.geoapify.com/v1/isoline?${new URLSearchParams({
      id: requestId,
      apiKey,
    })}`
  }

  throw new Error("Geoapify took too long to calculate the isochrone")
}

function wait(milliseconds: number, signal: AbortSignal) {
  signal.throwIfAborted()

  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      window.clearTimeout(timeout)
      reject(signal.reason)
    }
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort)
      resolve()
    }, milliseconds)

    signal.addEventListener("abort", handleAbort, { once: true })
  })
}
