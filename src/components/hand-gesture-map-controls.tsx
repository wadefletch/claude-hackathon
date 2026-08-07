import { useCallback, useEffect, useRef, useState } from "react"
import type {
  HandLandmarker,
  HandLandmarkerResult,
} from "@mediapipe/tasks-vision"
import {
  Camera,
  CameraOff,
  Hand,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useMap } from "@/components/ui/map"
import {
  getMapMotion,
  getPanGesture,
  getPinchPoses,
  getZoomGesture,
  smoothMapMotion,
} from "@/lib/pinch-gesture"
import type { GesturePose, MapMotion } from "@/lib/pinch-gesture"

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"

type TrackerState =
  "off" | "loading" | "searching" | "ready" | "panning" | "zooming" | "error"

const stateCopy: Record<Exclude<TrackerState, "error">, string> = {
  off: "Hand controls off",
  loading: "Loading hand controls…",
  searching: "Show a hand",
  ready: "Pinch to grab · add a second to zoom",
  panning: "One pinch · move to pan",
  zooming: "Two pinches · spread to zoom",
}

const PINCH_START_RATIO = 0.35
const PINCH_RELEASE_RATIO = 0.68
const EMPTY_MOTION: MapMotion = { panX: 0, panY: 0, zoom: 0 }

export function HandGestureMapControls() {
  const { map, isLoaded } = useMap()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const gestureRef = useRef<GesturePose | null>(null)
  const mapMotionRef = useRef<MapMotion>(EMPTY_MOTION)
  const baseZoomRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)
  const [trackerState, setTrackerState] = useState<TrackerState>("off")
  const [error, setError] = useState<string | null>(null)

  const resetGesture = useCallback(() => {
    gestureRef.current = null
    mapMotionRef.current = EMPTY_MOTION
  }, [])

  const stopTracking = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    resetGesture()
    lastVideoTimeRef.current = -1
    setError(null)
    setTrackerState("off")
  }, [resetGesture])

  useEffect(() => stopTracking, [stopTracking])

  const drawHands = useCallback((result: HandLandmarkerResult) => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return

    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) return

    context.clearRect(0, 0, width, height)
    context.fillStyle = "rgba(255, 255, 255, 0.95)"
    for (const hand of result.landmarks) {
      for (const landmark of hand) {
        context.beginPath()
        context.arc(
          (1 - landmark.x) * width,
          landmark.y * height,
          3,
          0,
          Math.PI * 2
        )
        context.fill()
      }
    }
  }, [])

  const applyGesture = useCallback(
    (result: HandLandmarkerResult) => {
      if (!map) return
      const pinches = getPinchPoses(result.landmarks)

      if (pinches.length === 0) {
        resetGesture()
        setTrackerState("searching")
        return
      }

      const baseline = gestureRef.current
      const threshold = baseline ? PINCH_RELEASE_RATIO : PINCH_START_RATIO
      const heldPinches = pinches.filter(
        (pinch) => pinch.pinchRatio <= threshold
      )
      const zoomPinches =
        baseline?.kind === "zoom"
          ? heldPinches
          : pinches.filter((pinch) => pinch.pinchRatio <= PINCH_START_RATIO)
      const zoomGesture = getZoomGesture(zoomPinches)

      const startGesture = (gesture: GesturePose) => {
        gestureRef.current = gesture
        mapMotionRef.current = EMPTY_MOTION
        baseZoomRef.current = map.getZoom()
        setTrackerState(gesture.kind === "zoom" ? "zooming" : "panning")
      }

      if (zoomGesture && baseline?.kind !== "zoom") {
        startGesture(zoomGesture)
        return
      }

      if (
        !zoomGesture &&
        heldPinches.length === 1 &&
        baseline?.kind !== "pan"
      ) {
        startGesture(getPanGesture(heldPinches[0]))
        return
      }

      if (heldPinches.length === 0) {
        resetGesture()
        setTrackerState("ready")
        return
      }

      const activeBaseline = gestureRef.current
      if (!activeBaseline) {
        setTrackerState("ready")
        return
      }

      const current =
        activeBaseline.kind === "zoom"
          ? zoomGesture
          : getPanGesture(heldPinches[0])
      if (!current) return

      const canvas = map.getCanvas()
      const targetMotion = getMapMotion(activeBaseline, current, {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      })
      const previousMotion = mapMotionRef.current
      const nextMotion = smoothMapMotion(previousMotion, targetMotion)
      mapMotionRef.current = nextMotion

      const panX = nextMotion.panX - previousMotion.panX
      const panY = nextMotion.panY - previousMotion.panY
      const zoom = Math.max(
        map.getMinZoom(),
        Math.min(map.getMaxZoom(), baseZoomRef.current + nextMotion.zoom)
      )

      // Keep every visual layer on the same camera state. Separate panBy and
      // setZoom calls emitted two move cycles per video frame, so WebGL layers
      // and DOM-backed markers could briefly render different transforms.
      const cameraChanged =
        Math.abs(panX) > 0.01 ||
        Math.abs(panY) > 0.01 ||
        Math.abs(zoom - map.getZoom()) > 0.0001
      if (cameraChanged) {
        const centerPoint = map.project(map.getCenter())
        const center = map.unproject([
          centerPoint.x + panX,
          centerPoint.y + panY,
        ])
        map.jumpTo({ center, zoom })
      }

      setTrackerState(activeBaseline.kind === "zoom" ? "zooming" : "panning")
    },
    [map, resetGesture]
  )

  const startTracking = useCallback(async () => {
    if (!map || !isLoaded) return
    const mediaDevices = Reflect.get(navigator, "mediaDevices") as
      MediaDevices | undefined
    if (!mediaDevices) {
      setError("Camera access is not supported in this browser.")
      setTrackerState("error")
      return
    }

    setError(null)
    setTrackerState("loading")

    try {
      const [{ FilesetResolver, HandLandmarker }, stream] = await Promise.all([
        import("@mediapipe/tasks-vision"),
        mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        }),
      ])
      streamRef.current = stream

      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      })
      landmarkerRef.current = landmarker

      const video = videoRef.current
      if (!video) throw new Error("Camera preview is unavailable.")
      video.srcObject = stream
      await video.play()
      setTrackerState("searching")

      const detect = () => {
        const activeVideo = videoRef.current
        const activeLandmarker = landmarkerRef.current
        if (!activeVideo || !activeLandmarker) return

        const now = performance.now()
        if (activeVideo.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = activeVideo.currentTime
          const result = activeLandmarker.detectForVideo(activeVideo, now)
          drawHands(result)
          applyGesture(result)
        }
        frameRef.current = requestAnimationFrame(detect)
      }
      frameRef.current = requestAnimationFrame(detect)
    } catch (cause) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      const denied =
        cause instanceof DOMException && cause.name === "NotAllowedError"
      setError(
        denied
          ? "Camera permission was denied. Allow access in your browser settings and try again."
          : "Hand controls could not start. Check your connection and camera, then try again."
      )
      setTrackerState("error")
    }
  }, [applyGesture, drawHands, isLoaded, map])

  const isActive = trackerState !== "off" && trackerState !== "error"

  return (
    <div className="absolute bottom-8 left-2 flex max-w-56 flex-col items-start gap-2 sm:bottom-2">
      {isActive && (
        <div className="overflow-hidden rounded-lg border bg-card shadow-md">
          <div className="relative aspect-[4/3] w-40 bg-muted">
            <video
              ref={videoRef}
              className="size-full scale-x-[-1] object-cover"
              muted
              playsInline
              aria-label="Mirrored camera preview for hand controls"
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 size-full"
              aria-hidden="true"
            />
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium shadow-sm">
              {trackerState === "loading" ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : (
                <Hand className="size-3" />
              )}
              {stateCopy[trackerState as Exclude<TrackerState, "error">]}
            </span>
          </div>
          <p className="max-w-40 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
            One pinch grabs and pans. Pinch with both hands, then spread them
            apart to zoom in or bring them together to zoom out. Release to
            pause.
          </p>
        </div>
      )}

      {error && (
        <div
          className="flex max-w-56 gap-2 rounded-lg border bg-card p-3 text-xs shadow-md"
          role="alert"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant={isActive ? "secondary" : "outline"}
        onClick={isActive ? stopTracking : startTracking}
        disabled={trackerState === "loading" || !isLoaded}
        aria-pressed={isActive}
      >
        {trackerState === "loading" ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : isActive ? (
          <CameraOff data-icon="inline-start" />
        ) : (
          <Camera data-icon="inline-start" />
        )}
        {isActive ? "Stop hand controls" : "Use hand controls"}
      </Button>
      <span className="sr-only" aria-live="polite">
        {error ??
          (trackerState === "error"
            ? "Hand controls error"
            : stateCopy[trackerState])}
      </span>
    </div>
  )
}
