import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { useNavigate } from "@tanstack/react-router"
import {
  Bot,
  Building2,
  BusFront,
  CarFront,
  Clock3,
  DollarSign,
  ExternalLink,
  Footprints,
  MapPin,
  Navigation,
  SearchCheck,
  Send,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrainFront,
  UsersRound,
  X,
} from "lucide-react"

import { AppMap } from "@/components/app-map"
import type {
  AppMapHome,
  AppMapState,
  GroceryStoreSelection,
} from "@/components/app-map"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  destination,
  getManualResults,
  getOptimizedResults,
  modes,
} from "@/lib/housing-data"
import type { Optimizer, TravelMode } from "@/lib/housing-data"
import { getBuildingReviewData } from "@/lib/building-reviews"
import { getNeighborhoodSnapshot } from "@/lib/neighborhood-data"
import type { ShowMapInput } from "@/lib/agent/schemas"
import { cn } from "@/lib/utils"

const modeIcons = {
  train: TrainFront,
  walk: Footprints,
  drive: CarFront,
  rideshare: Navigation,
} satisfies Record<TravelMode, typeof TrainFront>

const WORK_LOCATION = {
  label: destination,
  coordinates: [-87.633, 41.882] as [number, number],
}

export function HousingExplorer() {
  const [maxMinutes, setMaxMinutes] = useState(35)
  const [manualMode, setManualMode] = useState<TravelMode>("train")
  const [optimizer, setOptimizer] = useState<Optimizer | null>(null)
  const explorer = useMemo(
    () =>
      optimizer
        ? getOptimizedResults(optimizer, maxMinutes)
        : getManualResults(manualMode, maxMinutes),
    [manualMode, maxMinutes, optimizer]
  )
  const activeMode = explorer.mode
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedGroceryStore, setSelectedGroceryStore] =
    useState<GroceryStoreSelection | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<
    "overview" | "reviews" | "neighborhood"
  >("overview")
  const detailDialogRef = useRef<HTMLDialogElement>(null)
  const detailTriggerRef = useRef<HTMLElement | null>(null)
  const {
    messages: chatMessages,
    sendMessage: sendChatMessage,
    status: chatStatus,
  } = useChat()
  const [chatInput, setChatInput] = useState("")

  // Agent-produced app/map state lives in the URL (query params), not just
  // in this component's memory, so a reload/back-forward preserves it and
  // other consumers (the map, other panels) can read it independently of
  // the chat thread. Navigating updates the query string without a full
  // page reload.
  const navigate = useNavigate({ from: "/" })

  const latestShowMapOutput = useMemo(() => {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const message = chatMessages[i]
      for (let j = message.parts.length - 1; j >= 0; j--) {
        const part = message.parts[j]
        if (
          part.type === "tool-show_map" &&
          part.state === "output-available"
        ) {
          return part.output as ShowMapInput
        }
      }
    }
    return null
  }, [chatMessages])

  useEffect(() => {
    if (!latestShowMapOutput) return
    navigate({
      search: (prev) => ({
        ...prev,
        profile: latestShowMapOutput.profile,
        matches: latestShowMapOutput.matches,
      }),
      replace: true,
    })
  }, [latestShowMapOutput, navigate])

  useEffect(() => {
    if (explorer.results.some((home) => home.id === selectedId)) return

    const nextSelectedId =
      explorer.winnerId ?? explorer.results.at(0)?.id ?? null
    setSelectedId(nextSelectedId)
    if (!nextSelectedId) setIsDetailOpen(false)
  }, [explorer])

  useEffect(() => {
    setSelectedGroceryStore(null)
  }, [activeMode, maxMinutes])

  useEffect(() => {
    const dialog = detailDialogRef.current
    if (isDetailOpen && dialog && !dialog.open) dialog.showModal()
  }, [isDetailOpen, selectedId])

  const openBuildingDetail = (id: string, trigger: HTMLElement) => {
    detailTriggerRef.current = trigger
    setSelectedId(id)
    setDetailTab("overview")
    setIsDetailOpen(true)
  }

  const closeBuildingDetail = () => {
    const dialog = detailDialogRef.current
    if (dialog?.open) dialog.close()
    else setIsDetailOpen(false)
  }

  const restoreDetailTriggerFocus = () => {
    setIsDetailOpen(false)
    const trigger = detailTriggerRef.current
    detailTriggerRef.current = null
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus()
    })
  }

  const selectManualMode = (mode: TravelMode) => {
    setManualMode(mode)
    setOptimizer(null)
  }

  const ActiveModeIcon = modeIcons[activeMode]
  const selectedHome = explorer.results.find((home) => home.id === selectedId)
  const mapHomes = useMemo<AppMapHome[]>(
    () =>
      explorer.results.map((home) => ({
        id: home.id,
        label: `${home.name} · ${home.neighborhood}`,
        coordinates: home.coordinates,
        rent: home.rent,
      })),
    [explorer.results]
  )
  const mapState = useMemo<AppMapState>(
    () => ({
      homes: mapHomes,
      work: WORK_LOCATION,
      selectedHomeId: selectedId,
      winnerId: explorer.winnerId,
      showGroceryStores: true,
      selectedGroceryStore,
      isochrone:
        activeMode === "walk"
          ? undefined
          : {
              origin: WORK_LOCATION,
              mode: activeMode === "train" ? "transit" : "drive",
              minutes: maxMinutes,
            },
    }),
    [
      activeMode,
      explorer.winnerId,
      mapHomes,
      maxMinutes,
      selectedGroceryStore,
      selectedId,
    ]
  )
  const reviewData = selectedHome ? getBuildingReviewData(selectedHome) : null
  const neighborhoodData = selectedHome
    ? getNeighborhoodSnapshot(selectedHome.id)
    : null
  const heading = optimizer
    ? optimizer === "cheapest"
      ? "Best value match"
      : "Fastest match"
    : `${explorer.results.length} reachable ${explorer.results.length === 1 ? "home" : "homes"}`

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-8 xl:px-10">
        <a
          className="inline-flex items-center gap-2 text-sm font-medium"
          href="#top"
          aria-label="Qualifind home"
        >
          <span
            className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <SearchCheck className="size-4" />
          </span>
          <span>Qualifind</span>
        </a>
        <Badge variant="outline">Chicago, IL</Badge>
      </header>

      <section
        className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-8 xl:px-10"
        id="top"
      >
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Affordable housing · commute explorer
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-5xl">
          Find a home that gets you there.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Compare affordable homes across Chicago by commute time and monthly
          travel cost.
        </p>
      </section>

      <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 items-start gap-4 px-3 pb-12 sm:px-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(560px,1fr)_350px] xl:px-10">
        <aside
          className="flex flex-col overflow-hidden rounded-xl border bg-card p-4 lg:h-[760px]"
          aria-label="Housing and commute filters"
        >
          <div className="flex items-center gap-3 pb-4">
            <span
              className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground"
              aria-hidden="true"
            >
              <SlidersHorizontal className="size-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Search controls</p>
              <h2 className="font-medium">Filters</h2>
            </div>
          </div>

          <section className="py-4" aria-labelledby="destination-label">
            <h3
              id="destination-label"
              className="mb-3 text-xs font-medium text-muted-foreground"
            >
              Destination
            </h3>
            <div
              className="flex items-center gap-3"
              aria-label={`Destination: ${destination}`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <MapPin className="size-4" />
              </span>
              <strong className="text-sm leading-snug font-medium">
                {destination}
              </strong>
            </div>
          </section>

          <Separator />

          <section className="py-4" aria-labelledby="commute-label">
            <div className="mb-3 flex items-center justify-between gap-4 text-sm font-medium">
              <span
                id="commute-label"
                className="inline-flex items-center gap-2"
              >
                <Clock3 className="size-4 text-muted-foreground" /> Maximum
                commute
              </span>
              <output className="tabular-nums" aria-live="polite">
                {maxMinutes} min
              </output>
            </div>
            <Slider
              aria-label="Maximum commute time in minutes"
              min={15}
              max={60}
              step={5}
              value={[maxMinutes]}
              onValueChange={(value) =>
                setMaxMinutes(Array.isArray(value) ? value[0] : value)
              }
            />
            <div
              className="mt-2 flex justify-between text-xs text-muted-foreground"
              aria-hidden="true"
            >
              <span>15 min</span>
              <span>60 min</span>
            </div>
          </section>

          <Separator />

          <section className="py-4" aria-labelledby="mode-label">
            <h3
              id="mode-label"
              className="mb-3 text-xs font-medium text-muted-foreground"
            >
              Travel mode
            </h3>
            <ToggleGroup
              variant="outline"
              orientation="vertical"
              spacing={1}
              aria-label="Travel mode"
              className="w-full"
            >
              {(Object.keys(modes) as TravelMode[]).map((mode) => {
                const Icon = modeIcons[mode]
                return (
                  <ToggleGroupItem
                    key={mode}
                    value={mode}
                    pressed={!optimizer && manualMode === mode}
                    onPressedChange={(pressed) =>
                      pressed && selectManualMode(mode)
                    }
                    aria-label={`${modes[mode].label}, $${modes[mode].monthlyCost} monthly travel cost`}
                    className="w-full justify-start"
                  >
                    <Icon data-icon="inline-start" />
                    <span className="truncate">{modes[mode].label}</span>
                    <small className="ml-auto truncate text-xs text-muted-foreground">
                      ${modes[mode].monthlyCost}/mo
                    </small>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </section>

          <Separator />

          <section className="py-4" aria-labelledby="optimize-label">
            <h3
              id="optimize-label"
              className="mb-3 text-xs font-medium text-muted-foreground"
            >
              Optimize for
            </h3>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full justify-start"
                variant={optimizer === "cheapest" ? "default" : "outline"}
                onClick={() => setOptimizer("cheapest")}
                aria-pressed={optimizer === "cheapest"}
              >
                <DollarSign data-icon="inline-start" /> Cheapest
              </Button>
              <Button
                className="w-full justify-start"
                variant={optimizer === "quickest" ? "default" : "outline"}
                onClick={() => setOptimizer("quickest")}
                aria-pressed={optimizer === "quickest"}
              >
                <Sparkles data-icon="inline-start" /> Quickest
              </Button>
            </div>
          </section>

          <Separator />

          <section className="py-4" aria-labelledby="housing-label">
            <h3
              id="housing-label"
              className="mb-3 text-xs font-medium text-muted-foreground"
            >
              Housing filters
            </h3>
            <div
              className="flex flex-col gap-2"
              aria-describedby="future-filters-note"
            >
              {["Income eligibility", "Bedrooms", "Availability"].map(
                (filter) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-dashed p-2 text-sm text-muted-foreground"
                    key={filter}
                  >
                    <span>{filter}</span>
                    <Badge variant="outline">Soon</Badge>
                  </div>
                )
              )}
            </div>
            <p
              id="future-filters-note"
              className="mt-2 text-xs leading-5 text-muted-foreground"
            >
              More housing criteria will appear here as the search grows.
            </p>
          </section>
        </aside>

        <section
          className="grid min-w-0 gap-3"
          aria-label="Housing results and map"
        >
          <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
            <div className="flex h-16 items-center justify-between border-b px-4 text-sm font-medium">
              <div>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary ring-4 ring-primary/10" />
                  Commute area
                </span>
                <small className="mt-1 block text-xs font-normal text-muted-foreground">
                  Within {maxMinutes} minutes by{" "}
                  {modes[activeMode].label.toLowerCase()}
                </small>
              </div>
              <Badge>
                <ActiveModeIcon /> {modes[activeMode].label}
              </Badge>
            </div>

            <AppMap
              className="h-[440px] rounded-none border-0 shadow-none sm:h-[520px] xl:h-[650px]"
              state={mapState}
              onHomeSelect={(home, trigger) =>
                openBuildingDetail(home.id, trigger)
              }
              onGroceryStoreSelect={setSelectedGroceryStore}
            />

            <div
              className="flex min-h-11 flex-wrap items-center gap-x-5 gap-y-2 border-t px-4 py-2 text-xs text-muted-foreground"
              aria-label="Map legend"
            >
              <span className="inline-flex items-center gap-2">
                <i className="size-2 rounded-full bg-primary" /> Affordable home
              </span>
              <span className="inline-flex items-center gap-2">
                <i className="size-2 rounded-full bg-amber-600" /> Destination
              </span>
              <span className="inline-flex items-center gap-2">
                <i className="h-1 w-3 rounded-full bg-blue-600" /> CTA routes
              </span>
            </div>
          </div>

          <aside
            className="min-w-0 overflow-hidden rounded-xl border bg-card"
            aria-live="polite"
          >
            <div className="flex min-h-16 items-center justify-between border-b px-4">
              <div>
                <p className="text-xs text-muted-foreground">Matches</p>
                <h2 className="font-medium">{heading}</h2>
              </div>
              <Badge variant="outline">{explorer.results.length}</Badge>
            </div>

            <div className="flex gap-3 overflow-x-auto p-3">
              {explorer.results.length ? (
                explorer.results.map((home) => (
                  <Card
                    key={home.id}
                    className={cn(
                      "w-[clamp(280px,34vw,340px)] shrink-0 cursor-pointer",
                      selectedId === home.id && "ring-2 ring-primary"
                    )}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedId === home.id}
                    onClick={(event) =>
                      openBuildingDetail(home.id, event.currentTarget)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        openBuildingDetail(home.id, event.currentTarget)
                      }
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardDescription className="truncate">
                            {home.neighborhood}
                          </CardDescription>
                          <CardTitle>{home.name}</CardTitle>
                        </div>
                        {explorer.winnerId === home.id && (
                          <Badge className="shrink-0">
                            <Sparkles /> Best match
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{home.address}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 divide-x">
                        <div className="pr-3">
                          <dt className="text-xs text-muted-foreground">
                            Monthly rent
                          </dt>
                          <dd className="mt-1 font-medium">
                            ${home.rent.toLocaleString()}
                          </dd>
                        </div>
                        <div className="pl-3">
                          <dt className="text-xs text-muted-foreground">
                            Floor plan
                          </dt>
                          <dd className="mt-1 font-medium">
                            {home.beds === 0 ? "Studio" : `${home.beds} bed`}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                    <CardFooter className="justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <ActiveModeIcon className="size-4" /> {home.commute} min
                      </span>
                      <span>${home.monthlyCost}/mo travel</span>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <Empty className="min-h-56">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MapPin />
                    </EmptyMedia>
                    <EmptyTitle>No homes in range</EmptyTitle>
                    <EmptyDescription>
                      Increase your commute time or try a faster travel mode.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
            <p className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
              Demo only · All listings, rents, and commute estimates are
              fictional.
            </p>
          </aside>
        </section>

        {isDetailOpen && selectedHome && reviewData && neighborhoodData && (
          <dialog
            ref={detailDialogRef}
            className="fixed top-1/2 left-1/2 m-0 max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[960px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border-0 bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]"
            aria-labelledby="building-detail-title"
            aria-describedby="building-detail-description"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeBuildingDetail()
            }}
            onCancel={(event) => {
              event.preventDefault()
              closeBuildingDetail()
            }}
            onClose={restoreDetailTriggerFocus}
          >
            <section className="flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden bg-background sm:max-h-[calc(100dvh-2rem)]">
              <header className="flex items-start justify-between gap-4 border-b p-4 sm:items-center sm:px-6">
                <div>
                  <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                    Selected building
                  </p>
                  <h2
                    id="building-detail-title"
                    className="mt-1 text-xl font-medium tracking-tight"
                  >
                    {selectedHome.name}
                  </h2>
                  <p
                    id="building-detail-description"
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    {selectedHome.address} · {selectedHome.neighborhood}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col-reverse items-end gap-2 sm:flex-row sm:items-center">
                  <Badge variant="outline">
                    ${selectedHome.rent.toLocaleString()}/mo
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={closeBuildingDetail}
                    aria-label={`Close details for ${selectedHome.name}`}
                  >
                    <X />
                  </Button>
                </div>
              </header>

              <div
                className="flex gap-1 border-b px-2 sm:px-6"
                role="tablist"
                aria-label={`${selectedHome.name} details`}
                onKeyDown={(event) => {
                  const tabs = ["overview", "reviews", "neighborhood"] as const
                  if (
                    event.key === "ArrowLeft" ||
                    event.key === "ArrowRight" ||
                    event.key === "Home" ||
                    event.key === "End"
                  ) {
                    event.preventDefault()
                    const currentIndex = tabs.indexOf(detailTab)
                    const nextTab =
                      event.key === "Home"
                        ? tabs[0]
                        : event.key === "End"
                          ? tabs.at(-1)!
                          : tabs[
                              (currentIndex +
                                (event.key === "ArrowRight" ? 1 : -1) +
                                tabs.length) %
                                tabs.length
                            ]
                    setDetailTab(nextTab)
                    document.getElementById(`building-tab-${nextTab}`)?.focus()
                  }
                }}
              >
                <button
                  className={cn(
                    "min-h-12 border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    detailTab === "overview" && "border-primary text-foreground"
                  )}
                  id="building-tab-overview"
                  type="button"
                  role="tab"
                  aria-selected={detailTab === "overview"}
                  aria-controls="building-panel-overview"
                  tabIndex={detailTab === "overview" ? 0 : -1}
                  onClick={() => setDetailTab("overview")}
                >
                  Overview
                </button>
                <button
                  className={cn(
                    "min-h-12 border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    detailTab === "reviews" && "border-primary text-foreground"
                  )}
                  id="building-tab-reviews"
                  type="button"
                  role="tab"
                  aria-selected={detailTab === "reviews"}
                  aria-controls="building-panel-reviews"
                  tabIndex={detailTab === "reviews" ? 0 : -1}
                  onClick={() => setDetailTab("reviews")}
                >
                  Reviews
                </button>
                <button
                  className={cn(
                    "min-h-12 border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    detailTab === "neighborhood" &&
                      "border-primary text-foreground"
                  )}
                  id="building-tab-neighborhood"
                  type="button"
                  role="tab"
                  aria-selected={detailTab === "neighborhood"}
                  aria-controls="building-panel-neighborhood"
                  tabIndex={detailTab === "neighborhood" ? 0 : -1}
                  onClick={() => setDetailTab("neighborhood")}
                >
                  Neighborhood
                </button>
              </div>

              <div className="overflow-y-auto">
                {detailTab === "overview" ? (
                  <div
                    id="building-panel-overview"
                    className="grid min-h-52 gap-6 p-4 focus-visible:outline-2 focus-visible:outline-ring sm:p-6 lg:grid-cols-[minmax(250px,0.8fr)_minmax(420px,1.2fr)] lg:items-center"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="building-tab-overview"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
                        aria-hidden="true"
                      >
                        <Building2 className="size-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-medium">
                          A closer look at this match
                        </h3>
                        <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                          {selectedHome.name} is an affordable home in{" "}
                          {selectedHome.neighborhood}, currently reachable
                          within your selected commute range.
                        </p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border sm:grid-cols-4">
                      <div className="border-b p-4 sm:border-r sm:border-b-0">
                        <dt className="text-xs text-muted-foreground">
                          Monthly rent
                        </dt>
                        <dd className="mt-1 text-sm font-medium">
                          ${selectedHome.rent.toLocaleString()}
                        </dd>
                      </div>
                      <div className="border-b p-4 sm:border-r sm:border-b-0">
                        <dt className="text-xs text-muted-foreground">
                          Floor plan
                        </dt>
                        <dd className="mt-1 text-sm font-medium">
                          {selectedHome.beds === 0
                            ? "Studio"
                            : `${selectedHome.beds} bedroom`}
                        </dd>
                      </div>
                      <div className="border-r p-4 sm:border-r">
                        <dt className="text-xs text-muted-foreground">
                          {modes[activeMode].label} commute
                        </dt>
                        <dd className="mt-1 text-sm font-medium">
                          {selectedHome.commute} minutes
                        </dd>
                      </div>
                      <div className="p-4">
                        <dt className="text-xs text-muted-foreground">
                          Travel estimate
                        </dt>
                        <dd className="mt-1 text-sm font-medium">
                          ${selectedHome.monthlyCost}/month
                        </dd>
                      </div>
                    </dl>
                    <aside className="col-span-full flex flex-col items-stretch justify-between gap-4 rounded-xl border bg-muted p-4 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="text-sm font-medium">
                          Interested in affordable housing?
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                          The official CHA portal supports applications for
                          Public Housing, Project-Based Voucher, and
                          Project-Based Rental Assistance waitlists. Eligibility
                          and waitlist availability vary.
                        </p>
                      </div>
                      <Button
                        render={
                          <a
                            href="https://applyonline.thecha.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                        aria-label="Apply for housing on the CHA Waitlist Application portal (opens in a new tab)"
                      >
                        Apply for housing
                        <ExternalLink
                          data-icon="inline-end"
                          aria-hidden="true"
                        />
                      </Button>
                    </aside>
                  </div>
                ) : detailTab === "neighborhood" ? (
                  <div
                    id="building-panel-neighborhood"
                    className="grid min-h-52 gap-4 p-4 focus-visible:outline-2 focus-visible:outline-ring sm:p-6"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="building-tab-neighborhood"
                  >
                    <div>
                      <span className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                        <MapPin className="size-3" aria-hidden="true" />{" "}
                        Neighborhood snapshot
                      </span>
                      <h3 className="mt-1 text-lg font-medium">
                        {selectedHome.neighborhood}
                      </h3>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {neighborhoodData.overview}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <section
                        className="flex gap-3 rounded-xl border p-4"
                        aria-labelledby="transit-heading"
                      >
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted"
                          aria-hidden="true"
                        >
                          <BusFront className="size-4" />
                        </span>
                        <div>
                          <h4
                            id="transit-heading"
                            className="text-sm font-medium"
                          >
                            Transit access
                          </h4>
                          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground">
                            {neighborhoodData.transit.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </section>
                      <section
                        className="flex gap-3 rounded-xl border p-4"
                        aria-labelledby="essentials-heading"
                      >
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted"
                          aria-hidden="true"
                        >
                          <ShoppingBasket className="size-4" />
                        </span>
                        <div>
                          <h4
                            id="essentials-heading"
                            className="text-sm font-medium"
                          >
                            Nearby essentials
                          </h4>
                          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground">
                            {neighborhoodData.essentials.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </section>
                    </div>
                    <dl className="grid overflow-hidden rounded-xl border sm:grid-cols-3">
                      {neighborhoodData.facts.map((fact) => (
                        <div
                          className="border-b p-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
                          key={fact.label}
                        >
                          <dt className="text-xs text-muted-foreground">
                            {fact.label}
                          </dt>
                          <dd className="mt-1 text-sm font-medium">
                            {fact.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : (
                  <div
                    id="building-panel-reviews"
                    className="min-h-52 p-4 focus-visible:outline-2 focus-visible:outline-ring sm:p-6"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="building-tab-reviews"
                  >
                    <div className="mb-4 grid gap-3 sm:grid-cols-[190px_minmax(0,1fr)]">
                      <div
                        className="grid rounded-xl border p-4"
                        aria-label={`Overall rating ${reviewData.averageRating} out of 5 from ${reviewData.totalReviewCount} reviews`}
                      >
                        <span className="text-xs font-medium text-muted-foreground">
                          Overall rating
                        </span>
                        <strong className="my-1 text-3xl font-medium tracking-tight">
                          {reviewData.averageRating}
                        </strong>
                        <div
                          className="flex gap-0.5 text-amber-500"
                          aria-hidden="true"
                        >
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star
                              key={index}
                              className={cn(
                                "size-3",
                                index < Math.round(reviewData.averageRating) &&
                                  "fill-current"
                              )}
                            />
                          ))}
                        </div>
                        <small className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <UsersRound className="size-3" />{" "}
                          {reviewData.totalReviewCount} reviews
                        </small>
                      </div>
                      <div
                        className="grid overflow-hidden rounded-xl border sm:grid-cols-3"
                        aria-label="Ratings by source"
                      >
                        {reviewData.sources.map((source) => (
                          <div
                            className="grid content-center border-b p-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
                            key={source.source}
                          >
                            <span className="text-sm font-medium">
                              {source.source}
                            </span>
                            <strong className="mt-2 inline-flex items-center gap-1">
                              <Star
                                className="size-3 fill-amber-500 text-amber-500"
                                aria-hidden="true"
                              />{" "}
                              {source.rating}
                            </strong>
                            <small className="text-xs text-muted-foreground">
                              {source.reviewCount} reviews
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                      {reviewData.reviews.map((review) => (
                        <article
                          className="flex min-w-0 flex-col rounded-xl border p-4"
                          key={review.id}
                        >
                          <header className="flex items-center justify-between gap-2">
                            <div>
                              <span className="truncate text-sm font-medium">
                                {review.source}
                              </span>
                            </div>
                            <span
                              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium"
                              aria-label={`${review.rating} out of 5 stars`}
                            >
                              <Star
                                className="size-3 fill-amber-500 text-amber-500"
                                aria-hidden="true"
                              />{" "}
                              {review.rating}
                            </span>
                          </header>
                          <div className="my-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <strong>{review.author}</strong>
                            <time dateTime={review.date}>
                              · {review.recency}
                            </time>
                          </div>
                          <p className="flex-1 text-sm leading-6 text-muted-foreground">
                            {review.text}
                          </p>
                          <div
                            className="mt-3 flex flex-wrap gap-1"
                            aria-label="Review topics"
                          >
                            {review.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </dialog>
        )}

        <aside
          className="flex h-[480px] flex-col overflow-hidden rounded-xl border bg-card lg:col-span-2 xl:sticky xl:top-4 xl:col-span-1 xl:h-[760px]"
          aria-labelledby="agent-title"
        >
          <header className="flex items-center gap-3 border-b p-4">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <Bot className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="agent-title" className="text-sm font-medium">
                  Housing agent
                </h2>
                <span
                  className="size-2 rounded-full bg-muted-foreground/50"
                  aria-hidden="true"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ask about commute, budget, or eligibility
              </p>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            {chatMessages.length === 0 && (
              <div className="flex items-start gap-2">
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                  aria-hidden="true"
                >
                  <Bot className="size-3" />
                </span>
                <p className="rounded-lg bg-muted p-3 text-sm leading-6 text-muted-foreground">
                  Tell me about your commute, budget, and household — or ask
                  &ldquo;see if I qualify&rdquo; to check affordable housing
                  eligibility.
                </p>
              </div>
            )}
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-2",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                {message.role === "assistant" && (
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                    aria-hidden="true"
                  >
                    <Bot className="size-3" />
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <p
                          key={`${message.id}-${index}`}
                          className={cn(
                            "rounded-lg p-3 text-sm leading-6",
                            message.role === "user"
                              ? "ml-auto max-w-[85%] bg-primary text-primary-foreground"
                              : "max-w-[85%] bg-muted text-muted-foreground"
                          )}
                        >
                          {part.text}
                        </p>
                      )
                    }
                    if (
                      part.type === "tool-show_map" &&
                      part.state === "output-available"
                    ) {
                      const payload = part.output as ShowMapInput
                      return (
                        <div
                          key={`${message.id}-${index}`}
                          className="flex flex-col gap-3"
                        >
                          {payload.matches.map((match) => {
                            const workRoute = match.routes.find(
                              (route) => route.purpose === "work"
                            )
                            return (
                              <Card key={match.housing.id}>
                                <CardHeader>
                                  <CardDescription>
                                    {match.housing.communityArea ??
                                      match.housing.propertyName}
                                  </CardDescription>
                                  <CardTitle className="text-sm">
                                    {match.housing.address}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                  {workRoute && (
                                    <p>
                                      {workRoute.durationMinutes} min by{" "}
                                      {workRoute.mode} to work
                                    </p>
                                  )}
                                  <p className="mt-2 leading-6">
                                    {match.rationale}
                                  </p>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            ))}
          </div>

          <form
            className="grid grid-cols-[1fr_auto] gap-2 border-t p-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!chatInput.trim()) return
              sendChatMessage({ text: chatInput })
              setChatInput("")
            }}
          >
            <Label htmlFor="agent-message" className="sr-only">
              Message the housing agent
            </Label>
            <Textarea
              id="agent-message"
              className="min-h-16 resize-none"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder='Ask for a neighborhood, commute, or say "see if I qualify"…'
              rows={2}
              disabled={chatStatus === "streaming"}
            />
            <Button
              className="h-16"
              type="submit"
              disabled={chatStatus === "streaming" || !chatInput.trim()}
            >
              <Send data-icon="inline-start" /> Send
            </Button>
          </form>
        </aside>
      </div>
    </main>
  )
}
