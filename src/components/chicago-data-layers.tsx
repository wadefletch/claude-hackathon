import { useEffect, useId } from "react"
import type {
  GeoJSONSource,
  LayerSpecification,
  MapLayerMouseEvent,
} from "maplibre-gl"

import type { MapDataLayerFeature } from "@/components/map-data-layers"
import { useMap } from "@/components/ui/map"
import {
  CHICAGO_DATASET_IDS,
  chicagoGeoJsonUrl,
} from "@/lib/chicago-data-portal"
import {
  dataSourceMarkerImageId,
  registerDataSourceMarkerIcons,
} from "@/lib/map-data-source-icons"
import type { DataSourceMarkerIconName } from "@/lib/map-data-source-icons"

const CITY_ATTRIBUTION = "City of Chicago Data Portal"

type DataLayerProperties = Record<string, unknown>

type LayerSourceDefinition = {
  key: string
  data: string
  layers: (sourceId: string, layerIdPrefix: string) => LayerSpecification[]
  interactiveLayerSuffix: string
}

type StaticLayerDefinition = {
  id: string
  sources: readonly LayerSourceDefinition[]
  markerIcons?: readonly DataSourceMarkerIconName[]
  feature: (
    properties: DataLayerProperties,
    event: MapLayerMouseEvent
  ) => MapDataLayerFeature
}

function getFirstLabelLayer(
  map: NonNullable<ReturnType<typeof useMap>["map"]>
) {
  return map.getStyle().layers.find((layer) => layer.type === "symbol")?.id
}

function featureCoordinates(event: MapLayerMouseEvent): [number, number] {
  const geometry = event.features?.[0]?.geometry
  if (geometry?.type === "Point") {
    return geometry.coordinates.slice() as [number, number]
  }

  return [event.lngLat.lng, event.lngLat.lat]
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function details(...values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value))
}

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function StaticChicagoDataLayer({
  definition,
  onSelect,
}: {
  definition: StaticLayerDefinition
  onSelect: (feature: MapDataLayerFeature) => void
}) {
  const { map, isLoaded } = useMap()
  const instanceId = useId()

  useEffect(() => {
    if (!map || !isLoaded) return
    const mapInstance = map
    let cancelled = false
    const layerIds: string[] = []
    const sourceIds: string[] = []
    const interactiveLayerIds: string[] = []

    const handleClick = (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties
      if (!properties) return
      onSelect(definition.feature(properties, event))
    }
    const handleMouseEnter = () => {
      mapInstance.getCanvas().style.cursor = "pointer"
    }
    const handleMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = ""
    }

    async function setup() {
      if (definition.markerIcons?.length) {
        await registerDataSourceMarkerIcons(mapInstance, [
          ...definition.markerIcons,
        ])
      }
      if (cancelled) return

      const firstLabelLayer = getFirstLabelLayer(mapInstance)
      for (const source of definition.sources) {
        const sourceId = `${definition.id}-${source.key}-source-${instanceId}`
        const layerIdPrefix = `${definition.id}-${source.key}-${instanceId}`
        const layers = source.layers(sourceId, layerIdPrefix)

        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: source.data,
          attribution: CITY_ATTRIBUTION,
        })
        sourceIds.push(sourceId)

        for (const layer of layers) {
          mapInstance.addLayer(layer, firstLabelLayer)
          layerIds.push(layer.id)
        }

        interactiveLayerIds.push(
          `${layerIdPrefix}-${source.interactiveLayerSuffix}`
        )
      }

      for (const layerId of interactiveLayerIds) {
        mapInstance.on("click", layerId, handleClick)
        mapInstance.on("mouseenter", layerId, handleMouseEnter)
        mapInstance.on("mouseleave", layerId, handleMouseLeave)
      }
    }

    void setup()

    return () => {
      cancelled = true
      for (const layerId of interactiveLayerIds) {
        if (!mapInstance.getLayer(layerId)) continue
        mapInstance.off("click", layerId, handleClick)
        mapInstance.off("mouseenter", layerId, handleMouseEnter)
        mapInstance.off("mouseleave", layerId, handleMouseLeave)
      }
      for (const layerId of [...layerIds].reverse()) {
        if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId)
      }
      for (const sourceId of sourceIds) {
        if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId)
      }
      mapInstance.getCanvas().style.cursor = ""
    }
  }, [definition, instanceId, isLoaded, map, onSelect])

  return null
}

const PARKS_DEFINITION: StaticLayerDefinition = {
  id: "parks",
  sources: [
    {
      key: "boundaries",
      data: chicagoGeoJsonUrl(CHICAGO_DATASET_IDS.parks, {
        fields: [
          "the_geom",
          "park",
          "location",
          "park_class",
          "acres",
          "playground",
          "dog_friend",
          "pool_outdo",
        ],
      }),
      interactiveLayerSuffix: "fill",
      layers: (sourceId, prefix) => [
        {
          id: `${prefix}-fill`,
          type: "fill",
          source: sourceId,
          minzoom: 9,
          paint: {
            "fill-color": "#16a34a",
            "fill-opacity": 0.18,
          },
        },
        {
          id: `${prefix}-outline`,
          type: "line",
          source: sourceId,
          minzoom: 9,
          paint: {
            "line-color": "#15803d",
            "line-opacity": 0.8,
            "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.8, 14, 2],
          },
        },
      ],
    },
  ],
  feature: (properties, event) => {
    const acres = number(properties.acres)
    const amenities = [
      number(properties.playground) ? "Playground" : undefined,
      number(properties.dog_friend) ? "Dog-friendly area" : undefined,
      number(properties.pool_outdo) ? "Outdoor pool" : undefined,
    ].filter((value): value is string => Boolean(value))

    return {
      layerId: "parks",
      coordinates: featureCoordinates(event),
      title: text(properties.park) ?? "Chicago park",
      details: details(
        text(properties.location),
        text(properties.park_class),
        acres === undefined ? undefined : `${acres.toLocaleString()} acres`,
        amenities.length ? amenities.join(" · ") : undefined
      ),
    }
  },
}

const SCHOOLS_DEFINITION: StaticLayerDefinition = {
  id: "schools",
  markerIcons: ["school"],
  sources: [
    {
      key: "locations",
      data: chicagoGeoJsonUrl(CHICAGO_DATASET_IDS.schools, {
        fields: ["the_geom", "school_id", "short_name", "address", "grade_cat"],
      }),
      interactiveLayerSuffix: "symbol",
      layers: (sourceId, prefix) => [
        {
          id: `${prefix}-symbol`,
          type: "symbol",
          source: sourceId,
          minzoom: 10,
          layout: {
            "icon-image": dataSourceMarkerImageId("school"),
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              0.66,
              14,
              0.92,
            ],
            "icon-allow-overlap": false,
            "icon-padding": 2,
          },
        },
      ],
    },
  ],
  feature: (properties, event) => ({
    layerId: "schools",
    coordinates: featureCoordinates(event),
    title: text(properties.short_name) ?? "Chicago Public School",
    details: details(text(properties.address), text(properties.grade_cat)),
  }),
}

const SCHOOL_BOUNDARY_SOURCES = [
  {
    key: "elementary",
    datasetId: CHICAGO_DATASET_IDS.elementarySchoolBoundaries,
    fields: [
      "the_geom",
      "school_id",
      "school_add",
      "grade_cat",
      "boundarygr",
      "short_name",
    ],
    color: "#7c3aed",
  },
  {
    key: "middle",
    datasetId: CHICAGO_DATASET_IDS.middleSchoolBoundaries,
    fields: [
      "the_geom",
      "school_id",
      "school_add",
      "grade_cat",
      "boundarygr",
      "school_nam",
    ],
    color: "#2563eb",
  },
  {
    key: "high",
    datasetId: CHICAGO_DATASET_IDS.highSchoolBoundaries,
    fields: [
      "the_geom",
      "school_id",
      "school_add",
      "grade_cat",
      "boundarygr",
      "school_nam",
    ],
    color: "#ea580c",
  },
] as const

const SCHOOL_BOUNDARIES_DEFINITION: StaticLayerDefinition = {
  id: "school-boundaries",
  sources: SCHOOL_BOUNDARY_SOURCES.map((boundary) => ({
    key: boundary.key,
    data: chicagoGeoJsonUrl(boundary.datasetId, { fields: boundary.fields }),
    interactiveLayerSuffix: "fill",
    layers: (sourceId, prefix) => [
      {
        id: `${prefix}-fill`,
        type: "fill",
        source: sourceId,
        minzoom: 10,
        paint: {
          "fill-color": boundary.color,
          "fill-opacity": 0.08,
        },
      },
      {
        id: `${prefix}-outline`,
        type: "line",
        source: sourceId,
        minzoom: 10,
        paint: {
          "line-color": boundary.color,
          "line-opacity": 0.75,
          "line-width": 1.5,
          "line-dasharray": [3, 2],
        },
      },
    ],
  })),
  feature: (properties, event) => ({
    layerId: "school-boundaries",
    coordinates: featureCoordinates(event),
    title:
      text(properties.short_name) ??
      text(properties.school_nam) ??
      "School attendance boundary",
    details: details(
      text(properties.grade_cat),
      text(properties.boundarygr),
      text(properties.school_add),
      "Geographic context only; enrollment is not guaranteed."
    ),
  }),
}

const LIBRARIES_DEFINITION: StaticLayerDefinition = {
  id: "libraries",
  markerIcons: ["library"],
  sources: [
    {
      key: "locations",
      data: chicagoGeoJsonUrl(CHICAGO_DATASET_IDS.libraries, {
        fields: [
          "location",
          "branch_",
          "service_hours",
          "address",
          "phone",
          "branch_email",
        ],
      }),
      interactiveLayerSuffix: "symbol",
      layers: (sourceId, prefix) => [
        {
          id: `${prefix}-symbol`,
          type: "symbol",
          source: sourceId,
          minzoom: 10,
          layout: {
            "icon-image": dataSourceMarkerImageId("library"),
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              0.68,
              14,
              0.94,
            ],
            "icon-allow-overlap": false,
            "icon-padding": 2,
          },
        },
      ],
    },
  ],
  feature: (properties, event) => ({
    layerId: "libraries",
    coordinates: featureCoordinates(event),
    title: text(properties.branch_) ?? "Chicago Public Library",
    details: details(
      text(properties.address),
      text(properties.service_hours),
      text(properties.phone),
      text(properties.branch_email)
    ),
  }),
}

const DIVVY_DEFINITION: StaticLayerDefinition = {
  id: "divvy-stations",
  markerIcons: ["divvyStation"],
  sources: [
    {
      key: "stations",
      data: chicagoGeoJsonUrl(CHICAGO_DATASET_IDS.divvyStations, {
        fields: [
          "location",
          "id",
          "station_name",
          "total_docks",
          "docks_in_service",
          "status",
        ],
        where: "status = 'In Service'",
      }),
      interactiveLayerSuffix: "symbol",
      layers: (sourceId, prefix) => [
        {
          id: `${prefix}-symbol`,
          type: "symbol",
          source: sourceId,
          minzoom: 12,
          layout: {
            "icon-image": dataSourceMarkerImageId("divvyStation"),
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              0.62,
              15,
              0.9,
            ],
            "icon-allow-overlap": false,
            "icon-padding": 2,
          },
        },
      ],
    },
  ],
  feature: (properties, event) => {
    const docks = number(properties.docks_in_service)
    const totalDocks = number(properties.total_docks)
    return {
      layerId: "divvy-stations",
      coordinates: featureCoordinates(event),
      title: text(properties.station_name) ?? "Divvy station",
      details: details(
        text(properties.status),
        docks === undefined
          ? undefined
          : `${docks.toLocaleString()} of ${totalDocks?.toLocaleString() ?? "?"} docks in service`
      ),
    }
  },
}

const BIKE_ROUTES_DEFINITION: StaticLayerDefinition = {
  id: "bike-routes",
  sources: [
    {
      key: "routes",
      data: chicagoGeoJsonUrl(CHICAGO_DATASET_IDS.bikeRoutes, {
        fields: [
          "the_geom",
          "street",
          "st_name",
          "f_street",
          "t_street",
          "displayrou",
        ],
      }),
      interactiveLayerSuffix: "line",
      layers: (sourceId, prefix) => [
        {
          id: `${prefix}-line`,
          type: "line",
          source: sourceId,
          minzoom: 10,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#0891b2",
            "line-opacity": 0.85,
            "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 15, 4],
          },
        },
      ],
    },
  ],
  feature: (properties, event) => ({
    layerId: "bike-routes",
    coordinates: featureCoordinates(event),
    title:
      text(properties.street) ??
      text(properties.st_name) ??
      "Chicago bike route",
    details: details(
      text(properties.displayrou),
      text(properties.f_street) && text(properties.t_street)
        ? `${text(properties.f_street)} to ${text(properties.t_street)}`
        : undefined
    ),
  }),
}

const COMMUNITY_AREAS_DEFINITION: StaticLayerDefinition = {
  id: "community-areas",
  sources: [
    {
      key: "boundaries",
      data: chicagoGeoJsonUrl(CHICAGO_DATASET_IDS.communityAreas, {
        fields: ["the_geom", "area_numbe", "community"],
      }),
      interactiveLayerSuffix: "fill",
      layers: (sourceId, prefix) => [
        {
          id: `${prefix}-fill`,
          type: "fill",
          source: sourceId,
          minzoom: 8,
          paint: {
            "fill-color": "#737373",
            "fill-opacity": 0.035,
          },
        },
        {
          id: `${prefix}-outline`,
          type: "line",
          source: sourceId,
          minzoom: 8,
          paint: {
            "line-color": "#525252",
            "line-opacity": 0.65,
            "line-width": 1,
            "line-dasharray": [4, 2],
          },
        },
      ],
    },
  ],
  feature: (properties, event) => ({
    layerId: "community-areas",
    coordinates: featureCoordinates(event),
    title: text(properties.community) ?? "Chicago community area",
    details: details(
      number(properties.area_numbe) === undefined
        ? undefined
        : `Community area ${number(properties.area_numbe)}`
    ),
  }),
}

export function ParksDataLayer({
  onSelect,
}: {
  onSelect: (feature: MapDataLayerFeature) => void
}) {
  return (
    <StaticChicagoDataLayer definition={PARKS_DEFINITION} onSelect={onSelect} />
  )
}

export function SchoolsDataLayer({
  onSelect,
}: {
  onSelect: (feature: MapDataLayerFeature) => void
}) {
  return (
    <StaticChicagoDataLayer
      definition={SCHOOLS_DEFINITION}
      onSelect={onSelect}
    />
  )
}

export function SchoolBoundariesDataLayer({
  onSelect,
}: {
  onSelect: (feature: MapDataLayerFeature) => void
}) {
  return (
    <StaticChicagoDataLayer
      definition={SCHOOL_BOUNDARIES_DEFINITION}
      onSelect={onSelect}
    />
  )
}

export function LibrariesDataLayer({
  onSelect,
}: {
  onSelect: (feature: MapDataLayerFeature) => void
}) {
  return (
    <StaticChicagoDataLayer
      definition={LIBRARIES_DEFINITION}
      onSelect={onSelect}
    />
  )
}

export function DivvyStationsDataLayer({
  onSelect,
}: {
  onSelect: (feature: MapDataLayerFeature) => void
}) {
  return (
    <StaticChicagoDataLayer definition={DIVVY_DEFINITION} onSelect={onSelect} />
  )
}

export function BikeRoutesDataLayer({
  onSelect,
}: {
  onSelect: (feature: MapDataLayerFeature) => void
}) {
  return (
    <StaticChicagoDataLayer
      definition={BIKE_ROUTES_DEFINITION}
      onSelect={onSelect}
    />
  )
}

export function CommunityAreasDataLayer({
  onSelect,
}: {
  onSelect: (feature: MapDataLayerFeature) => void
}) {
  return (
    <StaticChicagoDataLayer
      definition={COMMUNITY_AREAS_DEFINITION}
      onSelect={onSelect}
    />
  )
}

export function BuildingViolationsDataLayer({
  onSelect,
}: {
  onSelect: (feature: MapDataLayerFeature) => void
}) {
  const { map, isLoaded } = useMap()
  const instanceId = useId()

  useEffect(() => {
    if (!map || !isLoaded) return
    const mapInstance = map
    let cancelled = false
    let request: AbortController | undefined
    const sourceId = `building-violations-source-${instanceId}`
    const layerId = `building-violations-layer-${instanceId}`

    const handleClick = (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties
      if (!properties) return

      onSelect({
        layerId: "building-violations",
        coordinates: featureCoordinates(event),
        title: text(properties.violation_description) ?? "Building violation",
        details: details(
          text(properties.address),
          text(properties.violation_status),
          text(properties.inspection_status),
          text(properties.violation_date)?.slice(0, 10),
          text(properties.violation_code)
        ),
      })
    }
    const handleMouseEnter = () => {
      mapInstance.getCanvas().style.cursor = "pointer"
    }
    const handleMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = ""
    }

    async function loadVisibleViolations() {
      request?.abort()
      const source = mapInstance.getSource<GeoJSONSource>(sourceId)
      if (!source) return

      if (mapInstance.getZoom() < 13) {
        source.setData({ type: "FeatureCollection", features: [] })
        return
      }

      const bounds = mapInstance.getBounds()
      const where = `violation_status = 'OPEN' AND within_box(location, ${bounds.getNorth()}, ${bounds.getWest()}, ${bounds.getSouth()}, ${bounds.getEast()})`
      const url = chicagoGeoJsonUrl(CHICAGO_DATASET_IDS.buildingViolations, {
        fields: [
          "location",
          "id",
          "violation_date",
          "violation_code",
          "violation_status",
          "violation_description",
          "address",
          "inspection_status",
        ],
        limit: 2_000,
        order: "violation_date DESC",
        where,
      })

      request = new AbortController()
      try {
        const response = await fetch(url, { signal: request.signal })
        if (!response.ok) return
        const data = (await response.json()) as GeoJSON.FeatureCollection
        if (!cancelled) source.setData(data)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          throw error
        }
      }
    }

    void registerDataSourceMarkerIcons(mapInstance, ["buildingViolation"]).then(
      () => {
        if (cancelled) return
        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          attribution: CITY_ATTRIBUTION,
        })
        mapInstance.addLayer(
          {
            id: layerId,
            type: "symbol",
            source: sourceId,
            minzoom: 13,
            layout: {
              "icon-image": dataSourceMarkerImageId("buildingViolation"),
              "icon-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                13,
                0.58,
                16,
                0.86,
              ],
              "icon-allow-overlap": false,
              "icon-padding": 2,
            },
          },
          getFirstLabelLayer(mapInstance)
        )

        mapInstance.on("click", layerId, handleClick)
        mapInstance.on("mouseenter", layerId, handleMouseEnter)
        mapInstance.on("mouseleave", layerId, handleMouseLeave)
        mapInstance.on("moveend", loadVisibleViolations)
        void loadVisibleViolations()
      }
    )

    return () => {
      cancelled = true
      request?.abort()
      mapInstance.off("moveend", loadVisibleViolations)
      if (mapInstance.getLayer(layerId)) {
        mapInstance.off("click", layerId, handleClick)
        mapInstance.off("mouseenter", layerId, handleMouseEnter)
        mapInstance.off("mouseleave", layerId, handleMouseLeave)
        mapInstance.removeLayer(layerId)
      }
      if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId)
      mapInstance.getCanvas().style.cursor = ""
    }
  }, [instanceId, isLoaded, map, onSelect])

  return null
}
