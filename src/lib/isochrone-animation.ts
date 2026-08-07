import type {
  Feature,
  FeatureCollection,
  Geometry,
  Polygon,
  Position,
} from "geojson"

type IsochroneData = FeatureCollection<Geometry>
type PolygonCoordinates = Polygon["coordinates"]

const MIN_RING_POINTS = 48
const MAX_RING_POINTS = 256

export function interpolateIsochrone(
  from: IsochroneData,
  to: IsochroneData,
  progress: number
): IsochroneData {
  if (progress <= 0) return from
  if (progress >= 1) return to

  return {
    ...to,
    features: to.features.map((feature, index) =>
      interpolateFeature(from.features[index], feature, progress)
    ),
  }
}

function interpolateFeature(
  from: Feature<Geometry> | undefined,
  to: Feature<Geometry>,
  progress: number
): Feature<Geometry> {
  if (!from) return to

  return {
    ...to,
    geometry: interpolateGeometry(from.geometry, to.geometry, progress),
  }
}

function interpolateGeometry(
  from: Geometry,
  to: Geometry,
  progress: number
): Geometry {
  const fromPolygons = asPolygons(from)
  const toPolygons = asPolygons(to)

  if (!fromPolygons || !toPolygons) return to
  if (!hasMatchingTopology(fromPolygons, toPolygons)) return to

  const coordinates = toPolygons.map((polygon, index) =>
    interpolatePolygon(
      fromPolygons[Math.min(index, fromPolygons.length - 1)],
      polygon,
      progress
    )
  )

  if (to.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: coordinates[0],
      ...(to.bbox ? { bbox: to.bbox } : {}),
    }
  }

  if (to.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates,
      ...(to.bbox ? { bbox: to.bbox } : {}),
    }
  }

  return to
}

function hasMatchingTopology(
  from: PolygonCoordinates[],
  to: PolygonCoordinates[]
): boolean {
  return (
    from.length === to.length &&
    from.every((polygon, index) => polygon.length === to[index].length)
  )
}

function asPolygons(geometry: Geometry): PolygonCoordinates[] | null {
  if (geometry.type === "Polygon") return [geometry.coordinates]
  if (geometry.type === "MultiPolygon") return geometry.coordinates
  return null
}

function interpolatePolygon(
  from: PolygonCoordinates,
  to: PolygonCoordinates,
  progress: number
): PolygonCoordinates {
  return to.map((ring, index) => {
    const fromRing = from[Math.min(index, from.length - 1)] ?? from[0]
    return interpolateRing(fromRing, ring, progress)
  })
}

function interpolateRing(
  from: Position[],
  to: Position[],
  progress: number
): Position[] {
  const pointCount = Math.min(
    MAX_RING_POINTS,
    Math.max(MIN_RING_POINTS, openRing(from).length, openRing(to).length)
  )
  const sampledFrom = sampleRing(from, pointCount)
  let sampledTo = sampleRing(to, pointCount)

  if (signedArea(sampledFrom) * signedArea(sampledTo) < 0) {
    sampledTo = [...sampledTo].reverse()
  }
  sampledTo = alignRing(sampledFrom, sampledTo)

  const interpolated = sampledFrom.map((position, index) => [
    position[0] + (sampledTo[index][0] - position[0]) * progress,
    position[1] + (sampledTo[index][1] - position[1]) * progress,
  ])

  return [...interpolated, interpolated[0]]
}

function sampleRing(ring: Position[], count: number): Position[] {
  const points = openRing(ring)
  if (points.length === 0) return Array.from({ length: count }, () => [0, 0])
  if (points.length === 1) {
    return Array.from({ length: count }, () => [...points[0]])
  }

  const lengths = points.map((point, index) =>
    distance(point, points[(index + 1) % points.length])
  )
  const perimeter = lengths.reduce((sum, length) => sum + length, 0)
  if (perimeter === 0) {
    return Array.from({ length: count }, () => [...points[0]])
  }

  const sampled: Position[] = []
  let segmentIndex = 0
  let segmentStart = 0

  for (let index = 0; index < count; index += 1) {
    const targetDistance = (index / count) * perimeter
    while (
      segmentIndex < lengths.length - 1 &&
      segmentStart + lengths[segmentIndex] < targetDistance
    ) {
      segmentStart += lengths[segmentIndex]
      segmentIndex += 1
    }

    const segmentProgress =
      lengths[segmentIndex] === 0
        ? 0
        : (targetDistance - segmentStart) / lengths[segmentIndex]
    const start = points[segmentIndex]
    const end = points[(segmentIndex + 1) % points.length]
    sampled.push([
      start[0] + (end[0] - start[0]) * segmentProgress,
      start[1] + (end[1] - start[1]) * segmentProgress,
    ])
  }

  return sampled
}

function alignRing(from: Position[], to: Position[]): Position[] {
  const comparisonStep = Math.max(1, Math.floor(from.length / 32))
  let bestOffset = 0
  let bestScore = Number.POSITIVE_INFINITY

  for (let offset = 0; offset < to.length; offset += 1) {
    let score = 0
    for (let index = 0; index < from.length; index += comparisonStep) {
      score += squaredDistance(from[index], to[(index + offset) % to.length])
    }
    if (score < bestScore) {
      bestScore = score
      bestOffset = offset
    }
  }

  return to.map((_, index) => to[(index + bestOffset) % to.length])
}

function openRing(ring: Position[]): Position[] {
  if (ring.length < 2) return ring
  const first = ring[0]
  const last = ring[ring.length - 1]
  return first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring
}

function signedArea(ring: Position[]): number {
  return ring.reduce((area, point, index) => {
    const next = ring[(index + 1) % ring.length]
    return area + point[0] * next[1] - next[0] * point[1]
  }, 0)
}

function distance(a: Position, b: Position): number {
  return Math.sqrt(squaredDistance(a, b))
}

function squaredDistance(a: Position, b: Position): number {
  const longitude = a[0] - b[0]
  const latitude = a[1] - b[1]
  return longitude * longitude + latitude * latitude
}
