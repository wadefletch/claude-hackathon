import { useEffect, useRef, useState } from "react"
import type { FeatureCollection, Geometry } from "geojson"
import { Building2, Sparkles } from "lucide-react"

import {
  DEFAULT_VISIBLE_MAP_DATA_LAYER_IDS,
  MapDataLayerControls,
  MapDataLayers,
} from "@/components/map-data-layers"
import type {
  MapDataLayerFeature,
  MapDataLayerId,
} from "@/components/map-data-layers"
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
import { HandGestureMapControls } from "@/components/hand-gesture-map-controls"
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
  isochrone?: IsochroneOptions
}

export type AppMapProps = {
  state: AppMapState
  onHomeSelect: (home: AppMapHome, trigger: HTMLElement) => void
  onNeighborhoodSelect?: (name: string) => void
  className?: string
}

type IsochroneData = FeatureCollection<Geometry>

const ISOCHRONE_TRANSITION_DURATION = 350
const STALE_ISOCHRONE_COLOR = "#737373"

export function AppMap({
  state,
  onHomeSelect,
  onNeighborhoodSelect,
  className,
}: AppMapProps) {
  const {
    homes,
    neighborhoodGroups,
    work,
    selectedHomeId,
    winnerId,
    isochrone,
  } = state
  const [visibleLayerIds, setVisibleLayerIds] = useState<MapDataLayerId[]>(
    DEFAULT_VISIBLE_MAP_DATA_LAYER_IDS
  )
  const [selectedDataLayerFeature, setSelectedDataLayerFeature] =
    useState<MapDataLayerFeature | null>(null)
  const isochroneOrigin = isochrone?.origin ?? work
  const { data: isochroneData, isPlaceholderData: isIsochroneStale } =
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

  const setLayerVisibilities = (layerIds: MapDataLayerId[]) => {
    setVisibleLayerIds(layerIds)
    if (
      selectedDataLayerFeature &&
      !layerIds.some((layerId) => layerId === selectedDataLayerFeature.layerId)
    ) {
      setSelectedDataLayerFeature(null)
    }
  }

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
        <HandGestureMapControls />
        <MapDataLayerControls
          visibleLayerIds={visibleLayerIds}
          onVisibleLayerIdsChange={setLayerVisibilities}
        />
        <MapDataLayers
          visibleLayerIds={visibleLayerIds}
          onFeatureSelect={setSelectedDataLayerFeature}
        />
        {isochrone && isochroneData && (
          <AnimatedIsochroneLayer
            data={isochroneData}
            color={isochroneColor}
            isStale={isIsochroneStale}
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
        {selectedDataLayerFeature && (
          <DataLayerFeaturePopup
            feature={selectedDataLayerFeature}
            onClose={() => setSelectedDataLayerFeature(null)}
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

function AnimatedIsochroneLayer({
  data,
  color,
  isStale,
}: {
  data: IsochroneData
  color: string
  isStale: boolean
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

  const layerColor = isStale ? STALE_ISOCHRONE_COLOR : color

  return (
    <MapGeoJSON
      id="travel-time-isochrone"
      data={animatedData}
      fillPaint={{
        "fill-color": layerColor,
        "fill-color-transition": { duration: 200 },
        "fill-opacity": 0.2,
      }}
      linePaint={{
        "line-color": layerColor,
        "line-color-transition": { duration: 200 },
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
            "grid size-8 cursor-pointer place-items-center rounded-full border-2 border-primary-foreground bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
            isSelected &&
              "relative z-10 scale-125 bg-sky-600 shadow-lg ring-4 ring-sky-500/40 hover:scale-125",
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

function DataLayerFeaturePopup({
  feature,
  onClose,
}: {
  feature: MapDataLayerFeature
  onClose: () => void
}) {
  return (
    <MapPopup
      longitude={feature.coordinates[0]}
      latitude={feature.coordinates[1]}
      onClose={onClose}
      closeOnClick={false}
      closeButton
      offset={10}
    >
      <div className="flex min-w-40 flex-col gap-1">
        <p className="font-medium">{feature.title}</p>
        {feature.details.map((detail) => (
          <p key={detail} className="text-sm text-muted-foreground">
            {detail}
          </p>
        ))}
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
