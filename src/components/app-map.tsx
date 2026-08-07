import { useEffect, useId, useRef, useState } from "react"
import type { FeatureCollection, Geometry } from "geojson"
import type { MapLayerMouseEvent } from "maplibre-gl"
import { Building2, Sparkles } from "lucide-react"

import {
  Map,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MapPopup,
  MarkerContent,
  MarkerLabel,
  useMap,
} from "@/components/ui/map"
import { TransitLayers } from "@/components/transit-layers"
import { useGeoapifyIsochrone } from "@/hooks/use-geoapify-isochrone"
import type { IsochroneMode } from "@/hooks/use-geoapify-isochrone"
import { interpolateIsochrone } from "@/lib/isochrone-animation"
import { cn } from "@/lib/utils"

export type AppMapLocation = {
  label: string
  coordinates: [number, number]
}

export type AppMapHome = AppMapLocation & {
  id: string
  rent?: number
}

export type GroceryStoreSelection = {
  coordinates: [number, number]
  store_name?: string
  address?: string
  new_status?: string
}

export type IsochroneOptions = {
  mode: IsochroneMode
  minutes: number
  origin?: AppMapLocation
}

export type AppMapState = {
  work: AppMapLocation
  homes: AppMapHome[]
  selectedHomeId: string | null
  winnerId: string | null
  showTransit: boolean
  showGroceryStores: boolean
  selectedGroceryStore: GroceryStoreSelection | null
  isochrone?: IsochroneOptions
}

export type AppMapProps = {
  state: AppMapState
  onHomeSelect: (home: AppMapHome, trigger: HTMLElement) => void
  onGroceryStoreSelect: (store: GroceryStoreSelection | null) => void
  className?: string
}

type GroceryStoreProperties = Omit<GroceryStoreSelection, "coordinates">

type IsochroneData = FeatureCollection<Geometry>

const ISOCHRONE_TRANSITION_DURATION = 350

export function AppMap({
  state,
  onHomeSelect,
  onGroceryStoreSelect,
  className,
}: AppMapProps) {
  const {
    homes,
    work,
    selectedHomeId,
    winnerId,
    showTransit,
    showGroceryStores,
    selectedGroceryStore,
    isochrone,
  } = state
  const isochroneOrigin = isochrone?.origin ?? work
  const { data: isochroneData } = useGeoapifyIsochrone(
    isochrone
      ? {
          coordinates: isochroneOrigin.coordinates,
          mode: isochrone.mode,
          minutes: isochrone.minutes,
        }
      : undefined
  )

  const isochroneColor = isochrone?.mode === "transit" ? "#2563eb" : "#ea580c"

  return (
    <section
      className={cn(
        "h-96 w-full overflow-hidden rounded-xl border shadow-sm",
        className
      )}
      aria-label={`Map of homes near ${work.label}`}
    >
      <Map>
        <MapControls showCompass showFullscreen />
        {showTransit && <TransitLayers />}
        {isochrone && isochroneData && (
          <AnimatedIsochroneLayer data={isochroneData} color={isochroneColor} />
        )}
        {homes.map((home) => (
          <HomeMarker
            key={home.id}
            home={home}
            isSelected={selectedHomeId === home.id}
            isWinner={winnerId === home.id}
            onSelect={onHomeSelect}
          />
        ))}
        <WorkMarker location={work} />
        {showGroceryStores && (
          <GroceryStoresLayer onSelect={onGroceryStoreSelect} />
        )}
        {showGroceryStores && selectedGroceryStore && (
          <GroceryStorePopup
            store={selectedGroceryStore}
            onClose={() => onGroceryStoreSelect(null)}
          />
        )}
        <LocationsViewport
          coordinates={[
            work.coordinates,
            ...homes.map((home) => home.coordinates),
          ]}
        />
      </Map>
    </section>
  )
}

function AnimatedIsochroneLayer({
  data,
  color,
}: {
  data: IsochroneData
  color: string
}) {
  const [animatedData, setAnimatedData] = useState(data)
  const animatedDataRef = useRef(data)

  useEffect(() => {
    if (data === animatedDataRef.current) return

    const from = animatedDataRef.current
    const startedAt = performance.now()
    let animationFrame = 0

    const animate = (now: number) => {
      const progress = Math.min(
        (now - startedAt) / ISOCHRONE_TRANSITION_DURATION,
        1
      )
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const nextData = interpolateIsochrone(from, data, easedProgress)

      animatedDataRef.current = nextData
      setAnimatedData(nextData)

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate)
      } else {
        animatedDataRef.current = data
        setAnimatedData(data)
      }
    }

    animationFrame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [data])

  return (
    <MapGeoJSON
      id="travel-time-isochrone"
      data={animatedData}
      fillPaint={{
        "fill-color": color,
        "fill-opacity": 0.2,
      }}
      linePaint={{
        "line-color": color,
        "line-width": 2,
      }}
    />
  )
}

function HomeMarker({
  home,
  isSelected,
  isWinner,
  onSelect,
}: {
  home: AppMapHome
  isSelected: boolean
  isWinner: boolean
  onSelect?: (home: AppMapHome, trigger: HTMLElement) => void
}) {
  return (
    <MapMarker
      longitude={home.coordinates[0]}
      latitude={home.coordinates[1]}
      onClick={(event) => onSelect?.(home, event.currentTarget as HTMLElement)}
    >
      <MarkerContent>
        <button
          type="button"
          className={cn(
            "grid size-8 place-items-center rounded-full border-2 border-primary-foreground bg-primary text-primary-foreground shadow-sm transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
            isSelected && "scale-110 ring-4 ring-primary/20",
            isWinner && "bg-amber-600"
          )}
          aria-label={`${home.label}${home.rent ? `, $${home.rent} rent` : ""}`}
          aria-pressed={isSelected}
        >
          {isWinner ? (
            <Sparkles className="size-4" />
          ) : (
            <Building2 className="size-4" />
          )}
        </button>
        {home.rent && <MarkerLabel position="bottom">${home.rent}</MarkerLabel>}
      </MarkerContent>
    </MapMarker>
  )
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

function WorkMarker({ location }: { location: AppMapLocation }) {
  return (
    <MapMarker
      longitude={location.coordinates[0]}
      latitude={location.coordinates[1]}
    >
      <MarkerContent>
        <div className="size-4 rounded-full bg-primary shadow-md ring-2 ring-background">
          <MarkerLabel>{`Work: ${location.label}`}</MarkerLabel>
        </div>
      </MarkerContent>
    </MapMarker>
  )
}

function LocationsViewport({
  coordinates,
}: {
  coordinates: [number, number][]
}) {
  const { map, isLoaded } = useMap()
  const coordinatesKey = coordinates.flat().join(",")

  useEffect(() => {
    if (!map || !isLoaded || coordinates.length < 2) return

    const longitudes = coordinates.map(([longitude]) => longitude)
    const latitudes = coordinates.map(([, latitude]) => latitude)

    map.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { padding: 56, maxZoom: 13, duration: 700 }
    )
  }, [coordinatesKey, isLoaded, map])

  return null
}
