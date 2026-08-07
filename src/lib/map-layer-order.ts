export type MapLayerPlacement = "coverage" | "transit" | "foreground"

export const MAP_LAYER_ANCHOR_IDS = {
  coverage: "qualifind-anchor-coverage",
  transit: "qualifind-anchor-transit",
  foreground: "qualifind-anchor-foreground",
} as const satisfies Record<MapLayerPlacement, string>

type StyleLayerSummary = {
  id: string
  type: string
}

/**
 * Find the label block that follows all basemap geometry. Some styles, notably
 * CARTO Positron, place an early waterway symbol before their road layers, so
 * the first symbol in the style is not a safe application-layer anchor.
 */
export function findPostGeometryLabelLayer(
  layers: readonly StyleLayerSummary[]
) {
  let lastGeometryIndex = -1

  for (let index = 0; index < layers.length; index += 1) {
    if (layers[index].type !== "symbol") lastGeometryIndex = index
  }

  return layers.find(
    (layer, index) => layer.type === "symbol" && index > lastGeometryIndex
  )?.id
}
