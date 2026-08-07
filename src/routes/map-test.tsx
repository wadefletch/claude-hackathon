import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { AppMap } from "@/components/app-map"
import type {
  AppMapLocation,
  GroceryStoreSelection,
} from "@/components/app-map"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute("/map-test")({
  component: MapTestPage,
})

type ChicagoLocation = AppMapLocation & { id: string }

type RouteDetails = {
  coordinates: [number, number][]
  distanceMeters: number
  durationSeconds: number
}

type OsrmRouteResponse = {
  code: string
  message?: string
  routes?: Array<{
    distance: number
    duration: number
    geometry: { coordinates: [number, number][] }
  }>
}

const LINCOLN_PARK = {
  id: "lincoln-park",
  label: "Lincoln Park",
  coordinates: [-87.6513, 41.9214],
} satisfies ChicagoLocation

const HOME_LOCATIONS = [
  LINCOLN_PARK,
  {
    id: "wicker-park",
    label: "Wicker Park",
    coordinates: [-87.6776, 41.9088],
  },
  {
    id: "hyde-park",
    label: "Hyde Park",
    coordinates: [-87.5907, 41.7943],
  },
] satisfies ChicagoLocation[]

const THE_LOOP = {
  id: "the-loop",
  label: "The Loop",
  coordinates: [-87.6298, 41.8781],
} satisfies ChicagoLocation

const WORK_LOCATIONS = [
  THE_LOOP,
  {
    id: "fulton-market",
    label: "Fulton Market",
    coordinates: [-87.6471, 41.8866],
  },
  {
    id: "streeterville",
    label: "Streeterville",
    coordinates: [-87.6226, 41.8925],
  },
] satisfies ChicagoLocation[]

function findLocation(
  locations: ChicagoLocation[],
  id: string,
  fallback: ChicagoLocation
) {
  return locations.find((location) => location.id === id) ?? fallback
}

function MapTestPage() {
  const [homeId, setHomeId] = useState(LINCOLN_PARK.id)
  const [workId, setWorkId] = useState(THE_LOOP.id)
  const [route, setRoute] = useState<RouteDetails | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showGroceryStores, setShowGroceryStores] = useState(true)
  const [selectedGroceryStore, setSelectedGroceryStore] =
    useState<GroceryStoreSelection | null>(null)

  const home = findLocation(HOME_LOCATIONS, homeId, LINCOLN_PARK)
  const work = findLocation(WORK_LOCATIONS, workId, THE_LOOP)

  useEffect(() => {
    const abortController = new AbortController()
    const start = home.coordinates.join(",")
    const end = work.coordinates.join(",")

    async function loadRoute() {
      setIsLoading(true)
      setRouteError(null)

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`,
          { signal: abortController.signal }
        )

        if (!response.ok) {
          throw new Error("The routing service could not calculate this trip.")
        }

        const data = (await response.json()) as OsrmRouteResponse
        const firstRoute = data.routes?.[0]

        if (data.code !== "Ok" || !firstRoute) {
          throw new Error(data.message ?? "No driving route was found.")
        }

        setRoute({
          coordinates: firstRoute.geometry.coordinates,
          distanceMeters: firstRoute.distance,
          durationSeconds: firstRoute.duration,
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        setRoute(null)
        setRouteError(
          error instanceof Error ? error.message : "Unable to load the route."
        )
      } finally {
        if (!abortController.signal.aborted) setIsLoading(false)
      }
    }

    void loadRoute()
    return () => abortController.abort()
  }, [home.coordinates, work.coordinates])

  const handleGroceryStoresChange = (checked: boolean) => {
    setShowGroceryStores(checked)
    if (!checked) setSelectedGroceryStore(null)
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 p-6 lg:p-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          MapCN · MapLibre GL
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Chicago commute explorer
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pick a home and work location to compare a driving route across the
          city.
        </p>
      </header>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <LocationSelect
          id="home-location"
          label="Home location"
          locations={HOME_LOCATIONS}
          value={homeId}
          onValueChange={setHomeId}
        />
        <LocationSelect
          id="work-location"
          label="Work location"
          locations={WORK_LOCATIONS}
          value={workId}
          onValueChange={setWorkId}
        />
      </FieldGroup>

      <Field orientation="horizontal" className="w-fit">
        <Checkbox
          id="show-grocery-stores"
          checked={showGroceryStores}
          onCheckedChange={handleGroceryStoresChange}
        />
        <FieldLabel htmlFor="show-grocery-stores">
          Show grocery stores
        </FieldLabel>
      </Field>

      <p className="min-h-5 text-sm text-muted-foreground" role="status">
        {isLoading && "Calculating route…"}
        {!isLoading && route && formatRouteSummary(route)}
        {!isLoading && routeError}
      </p>

      <AppMap
        home={home}
        work={work}
        routeCoordinates={route?.coordinates ?? null}
        isLoading={isLoading}
        showGroceryStores={showGroceryStores}
        selectedGroceryStore={selectedGroceryStore}
        onGroceryStoreSelect={setSelectedGroceryStore}
        className="h-[min(70svh,42rem)] min-h-80"
      />
    </main>
  )
}

function LocationSelect({
  id,
  label,
  locations,
  value,
  onValueChange,
}: {
  id: string
  label: string
  locations: ChicagoLocation[]
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={locations.map((location) => ({
          label: location.label,
          value: location.id,
        }))}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) onValueChange(nextValue)
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function formatRouteSummary(route: RouteDetails) {
  const miles = route.distanceMeters / 1609.344
  const minutes = Math.round(route.durationSeconds / 60)
  return `${miles.toFixed(1)} miles · about ${minutes} minutes by car`
}
