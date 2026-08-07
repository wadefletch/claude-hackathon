import { useEffect, useState } from "react"
import type { ReactNode } from "react"

import { useMap } from "@/components/ui/map"
import {
  findPostGeometryLabelLayer,
  MAP_LAYER_ANCHOR_IDS,
} from "@/lib/map-layer-order"

const ANCHOR_SOURCE_ID = "qualifind-layer-anchors"
const ANCHOR_LAYER_IDS = new Set<string>(Object.values(MAP_LAYER_ANCHOR_IDS))
const EMPTY_FEATURE_COLLECTION = {
  type: "FeatureCollection" as const,
  features: [],
}

/**
 * Installs stable application-owned strata into the active basemap style, then
 * mounts child layers. This keeps component timing and remote style internals
 * from deciding visual order.
 */
export function MapLayerAnchors({ children }: { children: ReactNode }) {
  const { map, isLoaded } = useMap()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsReady(false)
    if (!map || !isLoaded) return

    const basemapLayers = map
      .getStyle()
      .layers.filter((layer) => !ANCHOR_LAYER_IDS.has(layer.id))
    const firstPostGeometryLabel = findPostGeometryLabelLayer(basemapLayers)

    map.addSource(ANCHOR_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_FEATURE_COLLECTION,
    })

    for (const placement of ["coverage", "transit"] as const) {
      map.addLayer(
        {
          id: MAP_LAYER_ANCHOR_IDS[placement],
          type: "symbol",
          source: ANCHOR_SOURCE_ID,
          layout: { visibility: "none" },
        },
        firstPostGeometryLabel
      )
    }

    map.addLayer({
      id: MAP_LAYER_ANCHOR_IDS.foreground,
      type: "symbol",
      source: ANCHOR_SOURCE_ID,
      layout: { visibility: "none" },
    })

    setIsReady(true)

    return () => {
      for (const layerId of Object.values(MAP_LAYER_ANCHOR_IDS).reverse()) {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
      }
      if (map.getSource(ANCHOR_SOURCE_ID)) map.removeSource(ANCHOR_SOURCE_ID)
    }
  }, [isLoaded, map])

  return isReady ? children : null
}
