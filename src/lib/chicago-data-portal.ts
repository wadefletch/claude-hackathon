export const CHICAGO_DATASET_IDS = {
  parks: "ejsh-fztr",
  schools: "pb6d-zzuh",
  elementarySchoolBoundaries: "x72b-38qv",
  middleSchoolBoundaries: "fyff-53xy",
  highSchoolBoundaries: "xg7c-d8rm",
  libraries: "x8fc-8rcq",
  divvyStations: "bbyy-e7gq",
  bikeRoutes: "hvv9-38ut",
  communityAreas: "igwz-8jzy",
  buildingViolations: "22u3-xenr",
} as const

type ChicagoGeoJsonOptions = {
  fields?: readonly string[]
  limit?: number
  order?: string
  where?: string
}

export function chicagoGeoJsonUrl(
  datasetId: string,
  { fields, limit = 50_000, order, where }: ChicagoGeoJsonOptions = {}
) {
  const query = new URLSearchParams({ $limit: String(limit) })

  if (fields?.length) query.set("$select", fields.join(","))
  if (order) query.set("$order", order)
  if (where) query.set("$where", where)

  return `https://data.cityofchicago.org/resource/${datasetId}.geojson?${query}`
}
