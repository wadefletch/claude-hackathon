import type { NormalizedLandmark } from "@mediapipe/tasks-vision"

export type Point = { x: number; y: number }

export type PinchPose = {
  point: Point
  pinchRatio: number
}

export type PanGesture = {
  kind: "pan"
  point: Point
}

export type ZoomGesture = {
  kind: "zoom"
  midpoint: Point
  distance: number
}

export type GesturePose = PanGesture | ZoomGesture

export type MapMotion = {
  panX: number
  panY: number
  zoom: number
}

function midpoint(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  }
}

function getPinchPose(landmarks: NormalizedLandmark[]): PinchPose {
  const thumb = landmarks[4]
  const index = landmarks[8]
  const wrist = landmarks[0]
  const middleKnuckle = landmarks[9]
  const gap = Math.hypot(thumb.x - index.x, thumb.y - index.y)
  const palmSize = Math.max(
    Math.hypot(wrist.x - middleKnuckle.x, wrist.y - middleKnuckle.y),
    0.001
  )

  return {
    point: { x: 1 - (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 },
    pinchRatio: gap / palmSize,
  }
}

export function getPinchPoses(hands: NormalizedLandmark[][]): PinchPose[] {
  return hands
    .map(getPinchPose)
    .sort((first, second) => first.point.x - second.point.x)
}

export function getPanGesture(pinch: PinchPose): PanGesture {
  return { kind: "pan", point: pinch.point }
}

export function getZoomGesture(pinches: PinchPose[]): ZoomGesture | null {
  if (pinches.length < 2) return null
  const [first, second] = pinches

  return {
    kind: "zoom",
    midpoint: midpoint(first.point, second.point),
    distance: Math.hypot(
      second.point.x - first.point.x,
      second.point.y - first.point.y
    ),
  }
}

export function getMapMotion(
  baseline: GesturePose,
  current: GesturePose,
  viewport: { width: number; height: number }
): MapMotion {
  if (baseline.kind !== current.kind) return { panX: 0, panY: 0, zoom: 0 }

  const baselinePoint =
    baseline.kind === "pan" ? baseline.point : baseline.midpoint
  const currentPoint = current.kind === "pan" ? current.point : current.midpoint
  const x = currentPoint.x - baselinePoint.x
  const y = currentPoint.y - baselinePoint.y
  const zoom =
    baseline.kind === "zoom" && current.kind === "zoom"
      ? Math.log2(current.distance / Math.max(baseline.distance, 0.001)) * 2.6
      : 0

  return {
    panX: Math.abs(x) < 0.003 ? 0 : -x * viewport.width * 1.7,
    panY: Math.abs(y) < 0.003 ? 0 : -y * viewport.height * 1.7,
    zoom: Math.abs(zoom) < 0.025 ? 0 : Math.max(-3, Math.min(3, zoom)),
  }
}

export function smoothMapMotion(
  previous: MapMotion,
  target: MapMotion,
  alpha = 0.16
): MapMotion {
  return {
    panX: previous.panX + (target.panX - previous.panX) * alpha,
    panY: previous.panY + (target.panY - previous.panY) * alpha,
    zoom: previous.zoom + (target.zoom - previous.zoom) * alpha,
  }
}
