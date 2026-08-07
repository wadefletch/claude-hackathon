import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ShoppingBasket, TrainFront } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Map as MapLibreMap } from "maplibre-gl"

export type DataSourceMarkerIcon = {
  icon: LucideIcon
  label: string
  shape: "circle" | "rounded-square"
  background: `--${string}`
  foreground: `--${string}`
  border: `--${string}`
}

/**
 * Add a data source here, then reference its key from a map symbol layer.
 * The renderer turns any Lucide icon into the same themed map-marker badge.
 */
export const DATA_SOURCE_MARKER_ICONS = {
  groceryStore: {
    icon: ShoppingBasket,
    label: "Grocery store",
    shape: "rounded-square",
    background: "--success",
    foreground: "--success-foreground",
    border: "--background",
  },
  groceryStoreLimited: {
    icon: ShoppingBasket,
    label: "Online-orders-only grocery store",
    shape: "rounded-square",
    background: "--muted-foreground",
    foreground: "--background",
    border: "--background",
  },
  groceryStoreClosed: {
    icon: ShoppingBasket,
    label: "Closed grocery store",
    shape: "rounded-square",
    background: "--destructive",
    foreground: "--background",
    border: "--background",
  },
  railStation: {
    icon: TrainFront,
    label: "Train station",
    shape: "circle",
    background: "--foreground",
    foreground: "--background",
    border: "--background",
  },
} as const satisfies Record<string, DataSourceMarkerIcon>

export type DataSourceMarkerIconName = keyof typeof DATA_SOURCE_MARKER_ICONS

const SPRITE_SIZE = 64
const PIXEL_RATIO = 2

export function dataSourceMarkerImageId(name: DataSourceMarkerIconName) {
  return `data-source-marker-${name}`
}

export async function registerDataSourceMarkerIcons(
  map: MapLibreMap,
  names: DataSourceMarkerIconName[]
) {
  await Promise.all(
    names.map(async (name) => {
      const imageId = dataSourceMarkerImageId(name)
      if (map.hasImage(imageId)) return

      const imageData = await renderMarkerImage(DATA_SOURCE_MARKER_ICONS[name])
      if (!map.hasImage(imageId)) {
        map.addImage(imageId, imageData, { pixelRatio: PIXEL_RATIO })
      }
    })
  )
}

function themeColor(token: `--${string}`) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim()
}

function markerSvg(definition: DataSourceMarkerIcon) {
  const background = themeColor(definition.background)
  const foreground = themeColor(definition.foreground)
  const border = themeColor(definition.border)
  const badge =
    definition.shape === "circle"
      ? `<circle cx="32" cy="32" r="26" fill="${background}" stroke="${border}" stroke-width="4" />`
      : `<rect x="6" y="6" width="52" height="52" rx="14" fill="${background}" stroke="${border}" stroke-width="4" />`
  const icon = renderToStaticMarkup(
    createElement(definition.icon, {
      x: 17,
      y: 17,
      width: 30,
      height: 30,
      color: foreground,
      strokeWidth: 2.25,
      "aria-hidden": true,
    })
  )

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SPRITE_SIZE}" height="${SPRITE_SIZE}" viewBox="0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.22" />
      </filter>
    </defs>
    <g filter="url(#shadow)">${badge}${icon}</g>
  </svg>`
}

function renderMarkerImage(definition: DataSourceMarkerIcon) {
  return new Promise<ImageData>((resolve, reject) => {
    const image = new Image(SPRITE_SIZE, SPRITE_SIZE)
    const url = URL.createObjectURL(
      new Blob([markerSvg(definition)], { type: "image/svg+xml" })
    )

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = SPRITE_SIZE
        canvas.height = SPRITE_SIZE
        const context = canvas.getContext("2d")
        if (!context) throw new Error("Could not create map marker canvas")

        context.drawImage(image, 0, 0, SPRITE_SIZE, SPRITE_SIZE)
        resolve(context.getImageData(0, 0, SPRITE_SIZE, SPRITE_SIZE))
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not render ${definition.label} map marker`))
    }
    image.src = url
  })
}
