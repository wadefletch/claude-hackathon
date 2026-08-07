import { describe, expect, it } from "vitest"

import {
  getMapMotion,
  getPanGesture,
  getPinchPoses,
  getZoomGesture,
  smoothMapMotion,
} from "./pinch-gesture"

function hand({ thumbX, indexX }: { thumbX: number; indexX: number }) {
  const landmarks = Array.from({ length: 21 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
  }))
  landmarks[0] = { x: 0.5, y: 0.7, z: 0, visibility: 1 }
  landmarks[4] = { x: thumbX, y: 0.4, z: 0, visibility: 1 }
  landmarks[8] = { x: indexX, y: 0.4, z: 0, visibility: 1 }
  landmarks[9] = { x: 0.5, y: 0.5, z: 0, visibility: 1 }
  return landmarks
}

describe("pinch gesture math", () => {
  it("finds, mirrors, and orders each pinch point", () => {
    const poses = getPinchPoses([
      hand({ thumbX: 0.2, indexX: 0.3 }),
      hand({ thumbX: 0.7, indexX: 0.8 }),
    ])

    expect(poses[0].point.x).toBeCloseTo(0.25)
    expect(poses[1].point.x).toBeCloseTo(0.75)
    expect(poses[0].pinchRatio).toBeCloseTo(0.5)
  })

  it("uses one pinch for pan", () => {
    const baseline = getPanGesture({
      point: { x: 0.5, y: 0.5 },
      pinchRatio: 0.2,
    })
    const current = getPanGesture({
      point: { x: 0.6, y: 0.45 },
      pinchRatio: 0.2,
    })
    const motion = getMapMotion(baseline, current, { width: 1000, height: 500 })

    expect(motion.panX).toBeLessThan(0)
    expect(motion.panY).toBeGreaterThan(0)
    expect(motion.zoom).toBe(0)
  })

  it("uses the distance between two pinches for zoom", () => {
    const baseline = getZoomGesture([
      { point: { x: 0.4, y: 0.5 }, pinchRatio: 0.2 },
      { point: { x: 0.6, y: 0.5 }, pinchRatio: 0.2 },
    ])
    const current = getZoomGesture([
      { point: { x: 0.3, y: 0.5 }, pinchRatio: 0.2 },
      { point: { x: 0.7, y: 0.5 }, pinchRatio: 0.2 },
    ])

    if (!baseline || !current) throw new Error("Expected two-pinch gestures")
    const motion = getMapMotion(baseline, current, {
      width: 1000,
      height: 500,
    })
    expect(motion.zoom).toBeCloseTo(2.6)
    expect(motion.panX).toBe(0)
  })

  it("eases actual map motion toward the detected target", () => {
    const smoothed = smoothMapMotion(
      { panX: 0, panY: 0, zoom: 0 },
      { panX: 100, panY: -50, zoom: 2 },
      0.2
    )

    expect(smoothed).toEqual({ panX: 20, panY: -10, zoom: 0.4 })
  })

  it("settles instead of following small landmark noise", () => {
    const previous = { panX: 120, panY: -40, zoom: 1.25 }
    const smoothed = smoothMapMotion(previous, {
      panX: 122.5,
      panY: -43,
      zoom: 1.28,
    })

    expect(smoothed).toEqual(previous)
  })
})
