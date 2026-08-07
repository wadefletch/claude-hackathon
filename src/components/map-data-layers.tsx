import { createElement, useEffect, useId } from "react"
import type { ComponentType } from "react"
import type { MapLayerMouseEvent } from "maplibre-gl"
import {
  Bike,
  BusFront,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { useMap } from "@/components/ui/map"
import { Switch } from "@/components/ui/switch"
import {
  dataSourceMarkerImageId,
  registerDataSourceMarkerIcons,
} from "@/lib/map-data-source-icons"
import { MAP_LAYER_ANCHOR_IDS } from "@/lib/map-layer-order"
import type { MapLayerPlacement } from "@/lib/map-layer-order"

export type MapDataLayerFeature = {
  layerId: string
  coordinates: [number, number]
  title: string
  details: string[]
}

type MapDataLayerComponentProps = {
  beforeId: string
  onSelect: (feature: MapDataLayerFeature) => void
}

type MapDataLayerDefinition = {
  id: string
  label: string
  description: string
  icon: LucideIcon
  group: "essentials" | "mobility" | "context"
  defaultVisible: boolean
  placement: MapLayerPlacement
  component: ComponentType<MapDataLayerComponentProps>
}

function TransitDataLayer({ beforeId }: MapDataLayerComponentProps) {
  return <TransitLayers beforeId={beforeId} />
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
    placement: "transit",
    component: TransitDataLayer,
  },
  {
    id: "grocery-stores",
    label: "Groceries",
    description: "Full-service grocery stores and their operating status",
    icon: ShoppingBasket,
    group: "essentials",
    defaultVisible: true,
    placement: "foreground",
    component: GroceryStoresDataLayer,
  },
  {
    id: "parks",
    label: "Parks",
    description: "Chicago Park District boundaries and amenities",
    icon: Trees,
    group: "essentials",
    defaultVisible: false,
    placement: "coverage",
    component: ParksDataLayer,
  },
  {
    id: "schools",
    label: "Schools",
    description: "Chicago Public School locations for school year 2025–26",
    icon: School,
    group: "essentials",
    defaultVisible: false,
    placement: "foreground",
    component: SchoolsDataLayer,
  },
  {
    id: "libraries",
    label: "Libraries",
    description: "Chicago Public Library locations, hours, and contact details",
    icon: Library,
    group: "essentials",
    defaultVisible: false,
    placement: "foreground",
    component: LibrariesDataLayer,
  },
  {
    id: "divvy-stations",
    label: "Divvy",
    description: "In-service Divvy bicycle stations",
    icon: Bike,
    group: "mobility",
    defaultVisible: false,
    placement: "foreground",
    component: DivvyStationsDataLayer,
  },
  {
    id: "bike-routes",
    label: "Bike routes",
    description: "Chicago bicycle routes and facility types",
    icon: Route,
    group: "mobility",
    defaultVisible: false,
    placement: "transit",
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
    placement: "coverage",
    component: SchoolBoundariesDataLayer,
  },
  {
    id: "community-areas",
    label: "Community areas",
    description: "Official Chicago community area boundaries",
    icon: MapIcon,
    group: "context",
    defaultVisible: false,
    placement: "coverage",
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
    placement: "foreground",
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
          beforeId: MAP_LAYER_ANCHOR_IDS[layer.placement],
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
  const controlId = useId()
  const visibleLayers = new Set(visibleLayerIds)
  const setLayerVisibility = (layerId: MapDataLayerId, visible: boolean) => {
    onVisibleLayerIdsChange(
      visible
        ? [...new Set([...visibleLayerIds, layerId])]
        : visibleLayerIds.filter((visibleLayerId) => visibleLayerId !== layerId)
    )
  }

  return (
    <Card size="sm" className="absolute top-2 left-2 z-10 w-56 shadow-sm">
      <CardHeader>
        <CardTitle>Map layers</CardTitle>
      </CardHeader>
      <CardContent className="max-h-64 overflow-y-auto">
        <FieldGroup className="gap-3">
          {MAP_DATA_LAYER_GROUPS.map((group) => (
            <FieldSet key={group.id} className="gap-2">
              <FieldLegend variant="label">{group.label}</FieldLegend>
              <FieldGroup className="gap-2">
                {MAP_DATA_LAYERS.filter(
                  (layer) => layer.group === group.id
                ).map((layer) => {
                  const Icon = layer.icon
                  const switchId = `${controlId}-${layer.id}`

                  return (
                    <Field key={layer.id} orientation="horizontal">
                      <FieldLabel
                        htmlFor={switchId}
                        title={layer.description}
                        className="font-normal"
                      >
                        <Icon data-icon="inline-start" size={16} />
                        {layer.label}
                      </FieldLabel>
                      <Switch
                        id={switchId}
                        size="sm"
                        checked={visibleLayers.has(layer.id)}
                        onCheckedChange={(checked) =>
                          setLayerVisibility(layer.id, checked)
                        }
                      />
                    </Field>
                  )
                })}
              </FieldGroup>
            </FieldSet>
          ))}
        </FieldGroup>
      </CardContent>
    </Card>
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

function GroceryStoresDataLayer({
  beforeId,
  onSelect,
}: MapDataLayerComponentProps) {
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

      map.addLayer(
        {
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
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              9,
              0.68,
              14,
              0.94,
            ],
            "icon-allow-overlap": false,
            "icon-padding": 2,
          },
        },
        beforeId
      )

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
  }, [beforeId, isLoaded, layerId, map, onSelect, sourceId])

  return null
}
