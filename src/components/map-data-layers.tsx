import { createElement, useEffect, useId } from "react"
import type { ComponentType } from "react"
import type { MapLayerMouseEvent } from "maplibre-gl"
import {
  Bike,
  BusFront,
  Layers3,
  Library,
  Map as MapIcon,
  Route,
  School,
  Shapes,
  ShoppingBasket,
  Trees,
  TriangleAlert,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  BikeRoutesDataLayer,
  BuildingViolationsDataLayer,
  CommunityAreasDataLayer,
  DivvyStationsDataLayer,
  LibrariesDataLayer,
  ParksDataLayer,
  SchoolBoundariesDataLayer,
  SchoolsDataLayer,
} from "@/components/chicago-data-layers"
import { TransitLayers } from "@/components/transit-layers"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMap } from "@/components/ui/map"
import {
  dataSourceMarkerImageId,
  registerDataSourceMarkerIcons,
} from "@/lib/map-data-source-icons"

export type MapDataLayerFeature = {
  layerId: string
  coordinates: [number, number]
  title: string
  details: string[]
}

type MapDataLayerComponentProps = {
  onSelect: (feature: MapDataLayerFeature) => void
}

type MapDataLayerDefinition = {
  id: string
  label: string
  description: string
  icon: LucideIcon
  group: "essentials" | "mobility" | "context"
  defaultVisible: boolean
  component: ComponentType<MapDataLayerComponentProps>
}

function TransitDataLayer() {
  return <TransitLayers />
}

/**
 * Registry for optional map datasets. Add a definition here and the layer
 * automatically appears in both the map renderer and its visibility control.
 */
export const MAP_DATA_LAYERS = [
  {
    id: "transit",
    label: "Transit",
    description: "CTA train lines, stations, bus routes, and stops",
    icon: BusFront,
    group: "mobility",
    defaultVisible: false,
    component: TransitDataLayer,
  },
  {
    id: "grocery-stores",
    label: "Groceries",
    description: "Full-service grocery stores and their operating status",
    icon: ShoppingBasket,
    group: "essentials",
    defaultVisible: true,
    component: GroceryStoresDataLayer,
  },
  {
    id: "parks",
    label: "Parks",
    description: "Chicago Park District boundaries and amenities",
    icon: Trees,
    group: "essentials",
    defaultVisible: false,
    component: ParksDataLayer,
  },
  {
    id: "schools",
    label: "Schools",
    description: "Chicago Public School locations for school year 2025–26",
    icon: School,
    group: "essentials",
    defaultVisible: false,
    component: SchoolsDataLayer,
  },
  {
    id: "libraries",
    label: "Libraries",
    description: "Chicago Public Library locations, hours, and contact details",
    icon: Library,
    group: "essentials",
    defaultVisible: false,
    component: LibrariesDataLayer,
  },
  {
    id: "divvy-stations",
    label: "Divvy",
    description: "In-service Divvy bicycle stations",
    icon: Bike,
    group: "mobility",
    defaultVisible: false,
    component: DivvyStationsDataLayer,
  },
  {
    id: "bike-routes",
    label: "Bike routes",
    description: "Chicago bicycle routes and facility types",
    icon: Route,
    group: "mobility",
    defaultVisible: false,
    component: BikeRoutesDataLayer,
  },
  {
    id: "school-boundaries",
    label: "School zones",
    description:
      "Current elementary, middle, and high school attendance boundaries",
    icon: Shapes,
    group: "context",
    defaultVisible: false,
    component: SchoolBoundariesDataLayer,
  },
  {
    id: "community-areas",
    label: "Community areas",
    description: "Official Chicago community area boundaries",
    icon: MapIcon,
    group: "context",
    defaultVisible: false,
    component: CommunityAreasDataLayer,
  },
  {
    id: "building-violations",
    label: "Building violations",
    description:
      "Open building violations in the visible area; zoom in to view",
    icon: TriangleAlert,
    group: "context",
    defaultVisible: false,
    component: BuildingViolationsDataLayer,
  },
] as const satisfies readonly MapDataLayerDefinition[]

export type MapDataLayerId = (typeof MAP_DATA_LAYERS)[number]["id"]

export const DEFAULT_VISIBLE_MAP_DATA_LAYER_IDS: MapDataLayerId[] =
  MAP_DATA_LAYERS.filter((layer) => layer.defaultVisible).map(
    (layer) => layer.id
  )

export function MapDataLayers({
  visibleLayerIds,
  onFeatureSelect,
}: {
  visibleLayerIds: readonly MapDataLayerId[]
  onFeatureSelect: (feature: MapDataLayerFeature) => void
}) {
  const visibleLayers = new Set(visibleLayerIds)

  return MAP_DATA_LAYERS.map((layer) =>
    visibleLayers.has(layer.id)
      ? createElement(layer.component, {
          key: layer.id,
          onSelect: onFeatureSelect,
        })
      : null
  )
}

export function MapDataLayerControls({
  visibleLayerIds,
  onVisibleLayerIdsChange,
}: {
  visibleLayerIds: readonly MapDataLayerId[]
  onVisibleLayerIdsChange: (layerIds: MapDataLayerId[]) => void
}) {
  const visibleLayers = new Set(visibleLayerIds)
  const setLayerVisibility = (layerId: MapDataLayerId, visible: boolean) => {
    onVisibleLayerIdsChange(
      visible
        ? [...new Set([...visibleLayerIds, layerId])]
        : visibleLayerIds.filter((visibleLayerId) => visibleLayerId !== layerId)
    )
  }

  return (
    <div className="absolute top-2 left-2 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className="shadow-sm" />}
        >
          <Layers3 data-icon="inline-start" />
          Layers ({visibleLayerIds.length})
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-64">
          {MAP_DATA_LAYER_GROUPS.map((group, groupIndex) => (
            <div key={group.id}>
              {groupIndex > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup>
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                {MAP_DATA_LAYERS.filter(
                  (layer) => layer.group === group.id
                ).map((layer) => {
                  const Icon = layer.icon
                  const checked = visibleLayers.has(layer.id)
                  return (
                    <DropdownMenuCheckboxItem
                      key={layer.id}
                      checked={checked}
                      onCheckedChange={(nextChecked) =>
                        setLayerVisibility(layer.id, nextChecked === true)
                      }
                      aria-label={`${checked ? "Hide" : "Show"} ${layer.description}`}
                    >
                      <Icon />
                      {layer.label}
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuGroup>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

const MAP_DATA_LAYER_GROUPS = [
  { id: "essentials", label: "Everyday essentials" },
  { id: "mobility", label: "Transportation" },
  { id: "context", label: "Area and property context" },
] as const

type GroceryStoreProperties = {
  store_name?: string
  address?: string
  new_status?: string
}

function GroceryStoresDataLayer({ onSelect }: MapDataLayerComponentProps) {
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

      const properties = feature.properties as GroceryStoreProperties | null

      onSelect({
        layerId: "grocery-stores",
        coordinates: feature.geometry.coordinates.slice() as [number, number],
        title: properties?.store_name ?? "Grocery store",
        details: [properties?.address, properties?.new_status].filter(
          (detail): detail is string => Boolean(detail)
        ),
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
