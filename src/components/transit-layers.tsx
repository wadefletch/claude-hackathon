import { useEffect } from "react"

import { useMap } from "@/components/ui/map"
import {
  dataSourceMarkerImageId,
  registerDataSourceMarkerIcons,
} from "@/lib/map-data-source-icons"

const TRANSIT_SOURCE_IDS = [
  "cta-bus-routes",
  "cta-bus-stops",
  "cta-rail-lines",
  "cta-rail-stations",
] as const

const TRANSIT_LAYER_IDS = [
  "cta-bus-routes-line",
  "cta-rail-lines-casing",
  "cta-rail-lines-line",
  "cta-bus-stops-circle",
  "cta-rail-stations-symbol",
] as const

const CTA_ATTRIBUTION =
  "Chicago Transit Authority via City of Chicago Data Portal"

function getFirstLabelLayer(
  map: NonNullable<ReturnType<typeof useMap>["map"]>
) {
  return map.getStyle().layers.find((layer) => layer.type === "symbol")?.id
}

function chicagoGeoJson(datasetId: string, fields: string[]) {
  const query = new URLSearchParams({
    $limit: "50000",
    $select: fields.join(","),
  })

  return `https://data.cityofchicago.org/resource/${datasetId}.geojson?${query}`
}

const TRANSIT_DATA = {
  busRoutes: chicagoGeoJson("6uva-a5ei", [
    "the_geom",
    "route",
    "name",
    "wkday",
    "sat",
    "sun",
  ]),
  busStops: chicagoGeoJson("qs84-j7wh", [
    "the_geom",
    "systemstop",
    "public_nam",
    "routesstpg",
  ]),
  railLines: chicagoGeoJson("xbyr-jnvx", ["the_geom", "lines", "legend"]),
  railStations: chicagoGeoJson("3tzw-cg4m", [
    "the_geom",
    "station_id",
    "longname",
    "lines",
    "ada",
  ]),
} as const

export function TransitLayers() {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return
    let cancelled = false

    // Keep transit above every basemap geometry layer, including buildings,
    // while preserving basemap labels above the overlay.
    const firstLabelLayer = getFirstLabelLayer(map)

    map.addSource("cta-bus-routes", {
      type: "geojson",
      data: TRANSIT_DATA.busRoutes,
      attribution: CTA_ATTRIBUTION,
    })
    map.addSource("cta-bus-stops", {
      type: "geojson",
      data: TRANSIT_DATA.busStops,
      attribution: CTA_ATTRIBUTION,
    })
    map.addSource("cta-rail-lines", {
      type: "geojson",
      data: TRANSIT_DATA.railLines,
      attribution: CTA_ATTRIBUTION,
    })
    map.addSource("cta-rail-stations", {
      type: "geojson",
      data: TRANSIT_DATA.railStations,
      attribution: CTA_ATTRIBUTION,
    })

    map.addLayer(
      {
        id: "cta-bus-routes-line",
        type: "line",
        source: "cta-bus-routes",
        minzoom: 9,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#2563a8",
          "line-opacity": 0.55,
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 14, 2.5],
        },
      },
      firstLabelLayer
    )

    map.addLayer(
      {
        id: "cta-rail-lines-casing",
        type: "line",
        source: "cta-rail-lines",
        minzoom: 8,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#ffffff",
          "line-opacity": 0.9,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 4, 14, 7],
        },
      },
      firstLabelLayer
    )

    map.addLayer(
      {
        id: "cta-rail-lines-line",
        type: "line",
        source: "cta-rail-lines",
        minzoom: 8,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": [
            "match",
            ["get", "legend"],
            "RD",
            "#c60c30",
            "BL",
            "#00a1de",
            "BR",
            "#62361b",
            "GR",
            "#009b3a",
            "OR",
            "#f9461c",
            "PK",
            "#e27ea6",
            "PR",
            "#522398",
            "YL",
            "#f9e300",
            "#565656",
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 14, 5],
        },
      },
      firstLabelLayer
    )

    map.addLayer(
      {
        id: "cta-bus-stops-circle",
        type: "circle",
        source: "cta-bus-stops",
        minzoom: 13,
        paint: {
          "circle-color": "#ffffff",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 2, 16, 4],
          "circle-stroke-color": "#2563a8",
          "circle-stroke-width": 1.5,
        },
      },
      firstLabelLayer
    )

    void registerDataSourceMarkerIcons(map, ["railStation"]).then(() => {
      if (cancelled) return

      map.addLayer(
        {
          id: "cta-rail-stations-symbol",
          type: "symbol",
          source: "cta-rail-stations",
          minzoom: 9,
          layout: {
            "icon-image": dataSourceMarkerImageId("railStation"),
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              9,
              0.7,
              14,
              0.96,
            ],
            "icon-allow-overlap": false,
            "icon-padding": 2,
          },
        },
        firstLabelLayer
      )
    })

    return () => {
      cancelled = true
      for (const layerId of [...TRANSIT_LAYER_IDS].reverse()) {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
      }
      for (const sourceId of TRANSIT_SOURCE_IDS) {
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      }
    }
  }, [isLoaded, map])

  return null
}
