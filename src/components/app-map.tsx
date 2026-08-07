import { useEffect, useId, useState } from "react"
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
import { HandGestureMapControls } from "@/components/hand-gesture-map-controls"
import { useGeoapifyIsochrone } from "@/hooks/use-geoapify-isochrone"
import type { IsochroneMode } from "@/hooks/use-geoapify-isochrone"
import {
  dataSourceMarkerImageId,
  registerDataSourceMarkerIcons,
} from "@/lib/map-data-source-icons"
import { cn } from "@/lib/utils"

export type AppMapLocation = {
  label: string
  coordinates: [number, number]
}

export type AppMapHome = AppMapLocation & {
  id: string
  rent?: number
}

// A group of homes in one community area, rendered as a single bubble when
// zoomed out (hybrid clustering).
export type NeighborhoodGroup = {
  name: string
  coordinates: [number, number] // centroid [lng, lat]
  count: number
  homeIds: string[]
}

// Below this zoom, show neighborhood bubbles; at/above it, individual pins.
const NEIGHBORHOOD_ZOOM_THRESHOLD = 12.5

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
  neighborhoodGroups?: NeighborhoodGroup[]
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
  onNeighborhoodSelect?: (name: string) => void
  onGroceryStoreSelect: (store: GroceryStoreSelection | null) => void
  className?: string
}

type GroceryStoreProperties = Omit<GroceryStoreSelection, "coordinates">

export function AppMap({
  state,
  onHomeSelect,
  onNeighborhoodSelect,
  onGroceryStoreSelect,
  className,
}: AppMapProps) {
  const {
    homes,
    neighborhoodGroups,
    work,
    selectedHomeId,
    winnerId,
    showTransit,
    showGroceryStores,
    selectedGroceryStore,
    isochrone,
  } = state
  const isochroneOrigin = isochrone?.origin ?? work
  const { data: isochroneData, isFetching: isIsochroneLoading } =
    useGeoapifyIsochrone(
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
      <Map loading={isIsochroneLoading}>
        <MapControls showCompass showFullscreen />
        <HandGestureMapControls />
        {showTransit && <TransitLayers />}
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
        <HomesLayer
          homes={homes}
          groups={neighborhoodGroups}
          selectedHomeId={selectedHomeId}
          winnerId={winnerId}
          onHomeSelect={onHomeSelect}
          onNeighborhoodSelect={onNeighborhoodSelect}
        />
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

// Hybrid rendering: neighborhood bubbles when zoomed out, individual pins when
// zoomed in. Clicking a bubble flies to that group's bounds (which crosses the
// zoom threshold into pins) and notifies the parent to open its list panel.
function HomesLayer({
  homes,
  groups,
  selectedHomeId,
  winnerId,
  onHomeSelect,
  onNeighborhoodSelect,
}: {
  homes: AppMapHome[]
  groups?: NeighborhoodGroup[]
  selectedHomeId: string | null
  winnerId: string | null
  onHomeSelect: (home: AppMapHome, trigger: HTMLElement) => void
  onNeighborhoodSelect?: (name: string) => void
}) {
  const { map } = useMap()
  const [zoom, setZoom] = useState(map?.getZoom() ?? 10)

  useEffect(() => {
    if (!map) return
    const handleZoom = () => setZoom(map.getZoom())
    handleZoom()
    map.on("zoom", handleZoom)
    return () => {
      map.off("zoom", handleZoom)
    }
  }, [map])

  const showGroups =
    !!groups && groups.length > 0 && zoom < NEIGHBORHOOD_ZOOM_THRESHOLD

  const flyToGroup = (group: NeighborhoodGroup) => {
    const coordinates = homes
      .filter((home) => group.homeIds.includes(home.id))
      .map((home) => home.coordinates)
    if (!map || coordinates.length === 0) return
    const longitudes = coordinates.map(([lng]) => lng)
    const latitudes = coordinates.map(([, lat]) => lat)
    map.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { padding: 80, maxZoom: 14.5, duration: 600 }
    )
  }

  if (showGroups) {
    return (
      <>
        {groups.map((group) => (
          <NeighborhoodBubble
            key={group.name}
            group={group}
            onClick={() => {
              onNeighborhoodSelect?.(group.name)
              flyToGroup(group)
            }}
          />
        ))}
      </>
    )
  }

  return (
    <>
      {homes.map((home) => (
        <HomeMarker
          key={home.id}
          home={home}
          isSelected={selectedHomeId === home.id}
          isWinner={winnerId === home.id}
          onSelect={onHomeSelect}
        />
      ))}
    </>
  )
}

function NeighborhoodBubble({
  group,
  onClick,
}: {
  group: NeighborhoodGroup
  onClick: () => void
}) {
  const size = Math.round(34 + Math.min(30, group.count * 1.6))
  return (
    <MapMarker
      longitude={group.coordinates[0]}
      latitude={group.coordinates[1]}
      onClick={onClick}
    >
      <MarkerContent>
        <button
          type="button"
          onClick={onClick}
          className="flex flex-col items-center gap-1 focus-visible:outline-none"
          aria-label={`${group.name}: ${group.count} homes`}
        >
          <span
            className="grid place-items-center rounded-full border-2 border-primary-foreground bg-primary font-semibold text-primary-foreground shadow-md transition-transform hover:scale-105"
            style={{ width: size, height: size }}
          >
            {group.count}
          </span>
          <span className="rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-sm">
            {group.name}
          </span>
        </button>
      </MarkerContent>
    </MapMarker>
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
    let cancelled = false

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

    void registerDataSourceMarkerIcons(map, [
      "groceryStore",
      "groceryStoreLimited",
      "groceryStoreClosed",
    ]).then(() => {
      if (cancelled) return

      map.addSource(sourceId, {
        type: "geojson",
        data: "/data/grocery-store-status-historical.geojson",
      })

      map.addLayer({
        id: layerId,
        type: "symbol",
        source: sourceId,
        layout: {
          "icon-image": [
            "match",
            ["get", "new_status"],
            "CLOSED",
            dataSourceMarkerImageId("groceryStoreClosed"),
            "ONLINE ORDERS ONLY",
            dataSourceMarkerImageId("groceryStoreLimited"),
            dataSourceMarkerImageId("groceryStore"),
          ],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.68, 14, 0.94],
          "icon-allow-overlap": false,
          "icon-padding": 2,
        },
      })

      map.on("click", layerId, handleClick)
      map.on("mouseenter", layerId, handleMouseEnter)
      map.on("mouseleave", layerId, handleMouseLeave)
    })

    return () => {
      cancelled = true
      if (map.getLayer(layerId)) {
        map.off("click", layerId, handleClick)
        map.off("mouseenter", layerId, handleMouseEnter)
        map.off("mouseleave", layerId, handleMouseLeave)
      }
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
