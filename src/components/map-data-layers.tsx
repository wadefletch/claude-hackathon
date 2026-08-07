import { createElement, useEffect, useId } from "react"
import type { ComponentType } from "react"
import type { MapLayerMouseEvent } from "maplibre-gl"
import { BusFront, ShoppingBasket } from "lucide-react"
import type { LucideIcon } from "lucide-react"

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
    defaultVisible: false,
    placement: "transit",
    component: TransitDataLayer,
  },
  {
    id: "grocery-stores",
    label: "Groceries",
    description: "Full-service grocery stores and their operating status",
    icon: ShoppingBasket,
    defaultVisible: true,
    placement: "foreground",
    component: GroceryStoresDataLayer,
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
    const nextVisibleLayerIds = visible
      ? [...visibleLayerIds, layerId]
      : visibleLayerIds.filter((visibleLayerId) => visibleLayerId !== layerId)

    onVisibleLayerIdsChange(nextVisibleLayerIds)
  }

  return (
    <Card size="sm" className="absolute top-2 left-2 z-10 min-w-40 shadow-sm">
      <CardHeader>
        <CardTitle>Map layers</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldSet>
          <FieldLegend className="sr-only">Map layers</FieldLegend>
          <FieldGroup className="gap-2">
            {MAP_DATA_LAYERS.map((layer) => {
              const Icon = layer.icon
              const switchId = `${controlId}-${layer.id}`

              return (
                <Field key={layer.id} orientation="horizontal">
                  <FieldLabel htmlFor={switchId} title={layer.description}>
                    <Icon data-icon="inline-start" />
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
      </CardContent>
    </Card>
  )
}

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
