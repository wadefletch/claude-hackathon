import { useEffect, useId, useState } from "react"
import type { FeatureCollection, Geometry } from "geojson"
import type { MapLayerMouseEvent } from "maplibre-gl"

import {
  Map,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MapPopup,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  useMap,
} from "@/components/ui/map"
import { cn } from "@/lib/utils"

export type AppMapLocation = {
  label: string
  coordinates: [number, number]
}

export type GroceryStoreSelection = {
  coordinates: [number, number]
  store_name?: string
  address?: string
  new_status?: string
}

export type IsochroneOptions = {
  mode: "drive" | "transit"
  minutes: number
  origin?: AppMapLocation
}

export type AppMapProps = {
  home: AppMapLocation
  work: AppMapLocation
  routeCoordinates: [number, number][] | null
  isLoading: boolean
  showGroceryStores: boolean
  selectedGroceryStore: GroceryStoreSelection | null
  onGroceryStoreSelect: (store: GroceryStoreSelection | null) => void
  isochrone?: IsochroneOptions
  className?: string
}

type GroceryStoreProperties = Omit<GroceryStoreSelection, "coordinates">
type IsochroneData = FeatureCollection<Geometry>
type GeoapifyIsochroneResponse = IsochroneData & {
  properties?: { id?: string }
}

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY

export function AppMap({
  home,
  work,
  routeCoordinates,
  isLoading,
  showGroceryStores,
  selectedGroceryStore,
  onGroceryStoreSelect,
  isochrone,
  className,
}: AppMapProps) {
  const [isochroneData, setIsochroneData] = useState<IsochroneData | null>(null)
  const isochroneOrigin = isochrone?.origin ?? home
  const [isochroneLongitude, isochroneLatitude] = isochroneOrigin.coordinates
  const isochroneMode = isochrone?.mode
  const isochroneMinutes = isochrone?.minutes

  useEffect(() => {
    if (!isochroneMode || !isochroneMinutes || !GEOAPIFY_API_KEY) {
      setIsochroneData(null)
      return
    }

    const abortController = new AbortController()

    void fetchIsochrone(
      [isochroneLongitude, isochroneLatitude],
      isochroneMode,
      isochroneMinutes,
      GEOAPIFY_API_KEY,
      abortController.signal
    )
      .then(setIsochroneData)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setIsochroneData(null)
      })

    return () => abortController.abort()
  }, [isochroneLatitude, isochroneLongitude, isochroneMinutes, isochroneMode])

  const isochroneColor = isochrone?.mode === "transit" ? "#2563eb" : "#ea580c"

  return (
    <section
      className={cn(
        "h-96 w-full overflow-hidden rounded-xl border shadow-sm",
        className
      )}
      aria-label={`Driving route from ${home.label} to ${work.label}`}
    >
      <Map loading={isLoading}>
        <MapControls showCompass showFullscreen />
        {isochroneData && (
          <MapGeoJSON
            id="travel-time-isochrone"
            data={isochroneData}
            fillPaint={{
              "fill-color": isochroneColor,
              "fill-opacity": 0.2,
            }}
            linePaint={{
              "line-color": isochroneColor,
              "line-width": 2,
            }}
          />
        )}
        <LocationMarker location={home} type="Home" />
        <LocationMarker location={work} type="Work" />
        {showGroceryStores && (
          <GroceryStoresLayer onSelect={onGroceryStoreSelect} />
        )}
        {showGroceryStores && selectedGroceryStore && (
          <GroceryStorePopup
            store={selectedGroceryStore}
            onClose={() => onGroceryStoreSelect(null)}
          />
        )}
        {routeCoordinates && (
          <>
            <MapRoute coordinates={routeCoordinates} width={5} opacity={0.9} />
            <RouteViewport coordinates={routeCoordinates} />
          </>
        )}
      </Map>
    </section>
  )
}

async function fetchIsochrone(
  [longitude, latitude]: [number, number],
  mode: IsochroneOptions["mode"],
  minutes: number,
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

    await new Promise((resolve) => window.setTimeout(resolve, 1000))
    url = `https://api.geoapify.com/v1/isoline?${new URLSearchParams({
      id: requestId,
      apiKey,
    })}`
  }

  throw new Error("Geoapify took too long to calculate the isochrone")
}

function GroceryStoresLayer({
  onSelect,
}: {
  onSelect: (store: GroceryStoreSelection) => void
}) {
  const { map, isLoaded } = useMap()
  const id = useId()
  const sourceId = `grocery-stores-source-${id}`
  const layerId = `grocery-stores-layer-${id}`

  useEffect(() => {
    if (!map || !isLoaded) return

    map.addSource(sourceId, {
      type: "geojson",
      data: "/data/grocery-store-status-historical.geojson",
    })

    map.addLayer({
      id: layerId,
      type: "circle",
      source: sourceId,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 7],
        "circle-color": [
          "match",
          ["get", "new_status"],
          "CLOSED",
          "#dc2626",
          "ONLINE ORDERS ONLY",
          "#d97706",
          "#16a34a",
        ],
        "circle-opacity": 0.8,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1,
      },
    })

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      if (!feature || feature.geometry.type !== "Point") return

      const coordinates = feature.geometry.coordinates.slice() as [
        number,
        number,
      ]
      const properties = feature.properties as GroceryStoreProperties | null

      onSelect({
        coordinates,
        store_name: properties?.store_name,
        address: properties?.address,
        new_status: properties?.new_status,
      })
    }

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer"
    }
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = ""
    }

    map.on("click", layerId, handleClick)
    map.on("mouseenter", layerId, handleMouseEnter)
    map.on("mouseleave", layerId, handleMouseLeave)

    return () => {
      map.off("click", layerId, handleClick)
      map.off("mouseenter", layerId, handleMouseEnter)
      map.off("mouseleave", layerId, handleMouseLeave)
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
      map.getCanvas().style.cursor = ""
    }
  }, [isLoaded, layerId, map, onSelect, sourceId])

  return null
}

function GroceryStorePopup({
  store,
  onClose,
}: {
  store: GroceryStoreSelection
  onClose: () => void
}) {
  return (
    <MapPopup
      longitude={store.coordinates[0]}
      latitude={store.coordinates[1]}
      onClose={onClose}
      closeOnClick={false}
      closeButton
      offset={10}
    >
      <div className="flex min-w-40 flex-col gap-1">
        <p className="font-medium">{store.store_name ?? "Grocery store"}</p>
        {store.address && (
          <p className="text-sm text-muted-foreground">{store.address}</p>
        )}
        {store.new_status && (
          <p className="text-xs font-medium text-muted-foreground">
            {store.new_status}
          </p>
        )}
      </div>
    </MapPopup>
  )
}

function LocationMarker({
  location,
  type,
}: {
  location: AppMapLocation
  type: "Home" | "Work"
}) {
  return (
    <MapMarker
      longitude={location.coordinates[0]}
      latitude={location.coordinates[1]}
    >
      <MarkerContent>
        <div className="size-4 rounded-full bg-primary shadow-md ring-2 ring-background">
          <MarkerLabel>{`${type}: ${location.label}`}</MarkerLabel>
        </div>
      </MarkerContent>
    </MapMarker>
  )
}

function RouteViewport({ coordinates }: { coordinates: [number, number][] }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded || coordinates.length < 2) return

    const longitudes = coordinates.map(([longitude]) => longitude)
    const latitudes = coordinates.map(([, latitude]) => latitude)

    map.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { padding: 64, maxZoom: 13, duration: 700 }
    )
  }, [coordinates, isLoaded, map])

  return null
}
