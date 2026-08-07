import { createElement, useEffect, useId } from "react"
import type { ComponentType } from "react"
import type { MapLayerMouseEvent } from "maplibre-gl"
import { BusFront, ShoppingBasket } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { TransitLayers } from "@/components/transit-layers"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
    defaultVisible: false,
    component: TransitDataLayer,
  },
  {
    id: "grocery-stores",
    label: "Groceries",
    description: "Full-service grocery stores and their operating status",
    icon: ShoppingBasket,
    defaultVisible: true,
    component: GroceryStoresDataLayer,
  },
] as const satisfies readonly MapDataLayerDefinition[]

export type MapDataLayerId = (typeof MAP_DATA_LAYERS)[number]["id"]

export const DEFAULT_VISIBLE_MAP_DATA_LAYER_IDS: MapDataLayerId[] =
  MAP_DATA_LAYERS.filter((layer) => layer.defaultVisible).map(
    (layer) => layer.id
  )

function isMapDataLayerId(layerId: string): layerId is MapDataLayerId {
  return MAP_DATA_LAYERS.some((layer) => layer.id === layerId)
}

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

  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={1}
      multiple
      value={visibleLayerIds}
      onValueChange={(layerIds) =>
        onVisibleLayerIdsChange(layerIds.filter(isMapDataLayerId))
      }
      aria-label="Map data layers"
      className="absolute top-2 left-2 z-10 flex-wrap bg-background shadow-sm"
    >
      {MAP_DATA_LAYERS.map((layer) => {
        const Icon = layer.icon
        return (
          <ToggleGroupItem
            key={layer.id}
            value={layer.id}
            aria-label={`${visibleLayers.has(layer.id) ? "Hide" : "Show"} ${layer.description}`}
          >
            <Icon data-icon="inline-start" />
            {layer.label}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

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
