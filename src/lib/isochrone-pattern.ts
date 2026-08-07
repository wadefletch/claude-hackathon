import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl"

const PATTERN_IMAGE_SIZE = 64
const STRIPE_WIDTH = PATTERN_IMAGE_SIZE / 2
const MIN_PATTERN_ZOOM = 7
const MAX_PATTERN_ZOOM = 17
const REFERENCE_ZOOM = 10
const REFERENCE_PATTERN_SIZE = 14
const PATTERN_ZOOMS = Array.from(
  { length: MAX_PATTERN_ZOOM - MIN_PATTERN_ZOOM + 1 },
  (_, index) => MIN_PATTERN_ZOOM + index
)

function pendingIsochronePatternId(theme: string, zoom: number) {
  return `pending-isochrone-pattern-${theme}-${zoom}`
}

export function pendingIsochronePatternSizeAtZoom(zoom: number) {
  return REFERENCE_PATTERN_SIZE * 2 ** (zoom - REFERENCE_ZOOM)
}

export function pendingIsochronePatternExpression(
  theme: string
): ExpressionSpecification {
  const [minimumZoom, ...higherZooms] = PATTERN_ZOOMS

  return [
    "step",
    ["zoom"],
    ["image", pendingIsochronePatternId(theme, minimumZoom)],
    ...higherZooms.flatMap((zoom) => [
      zoom,
      ["image", pendingIsochronePatternId(theme, zoom)],
    ]),
  ] as unknown as ExpressionSpecification
}

export function registerPendingIsochronePatterns(
  map: MapLibreMap,
  theme: string
) {
  const styles = getComputedStyle(document.documentElement)
  const background = styles.getPropertyValue("--muted").trim()
  const stripe = styles.getPropertyValue("--muted-foreground").trim()
  const canvas = document.createElement("canvas")
  canvas.width = PATTERN_IMAGE_SIZE
  canvas.height = PATTERN_IMAGE_SIZE
  const context = canvas.getContext("2d")
  if (!context) return false

  context.fillStyle = background
  context.fillRect(0, 0, PATTERN_IMAGE_SIZE, PATTERN_IMAGE_SIZE)
  context.fillStyle = stripe

  for (let y = 0; y < PATTERN_IMAGE_SIZE; y += 1) {
    for (let x = 0; x < PATTERN_IMAGE_SIZE; x += 1) {
      if ((x + y) % PATTERN_IMAGE_SIZE < STRIPE_WIDTH) {
        context.fillRect(x, y, 1, 1)
      }
    }
  }

  const image = context.getImageData(
    0,
    0,
    PATTERN_IMAGE_SIZE,
    PATTERN_IMAGE_SIZE
  )

  for (const zoom of PATTERN_ZOOMS) {
    const imageId = pendingIsochronePatternId(theme, zoom)
    if (map.hasImage(imageId)) continue

    map.addImage(imageId, image, {
      pixelRatio: PATTERN_IMAGE_SIZE / pendingIsochronePatternSizeAtZoom(zoom),
    })
  }

  return true
}
