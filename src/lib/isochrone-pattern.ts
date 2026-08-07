import type { Map as MapLibreMap } from "maplibre-gl"

const PATTERN_SIZE = 40
const STRIPE_WIDTH = 20

export function pendingIsochronePatternId(theme: string) {
  return `pending-isochrone-pattern-${theme}`
}

export function registerPendingIsochronePattern(
  map: MapLibreMap,
  theme: string
) {
  const imageId = pendingIsochronePatternId(theme)
  if (map.hasImage(imageId)) return true

  const styles = getComputedStyle(document.documentElement)
  const background = styles.getPropertyValue("--muted").trim()
  const stripe = styles.getPropertyValue("--muted-foreground").trim()
  const canvas = document.createElement("canvas")
  canvas.width = PATTERN_SIZE
  canvas.height = PATTERN_SIZE
  const context = canvas.getContext("2d")
  if (!context) return false

  context.fillStyle = background
  context.fillRect(0, 0, PATTERN_SIZE, PATTERN_SIZE)
  context.fillStyle = stripe

  for (let y = 0; y < PATTERN_SIZE; y += 1) {
    for (let x = 0; x < PATTERN_SIZE; x += 1) {
      if ((x + y) % PATTERN_SIZE < STRIPE_WIDTH) {
        context.fillRect(x, y, 1, 1)
      }
    }
  }

  map.addImage(imageId, context.getImageData(0, 0, PATTERN_SIZE, PATTERN_SIZE))
  return true
}
