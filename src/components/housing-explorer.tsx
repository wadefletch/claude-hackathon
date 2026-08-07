import { useEffect, useMemo, useRef, useState } from "react"
import {
  Bot,
  Building2,
  BusFront,
  CarFront,
  Clock3,
  DollarSign,
  ExternalLink,
  Footprints,
  MessageSquareText,
  MapPin,
  Navigation,
  Send,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrainFront,
  UsersRound,
  X,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { cn } from "@/lib/utils"

const modeIcons = {
  train: TrainFront,
  walk: Footprints,
  drive: CarFront,
  rideshare: Navigation,
} satisfies Record<TravelMode, typeof TrainFront>

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<
    "overview" | "reviews" | "neighborhood"
  >("overview")
  const detailDialogRef = useRef<HTMLDialogElement>(null)
  const detailTriggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (explorer.results.some((home) => home.id === selectedId)) return

    const nextSelectedId =
      explorer.winnerId ?? explorer.results.at(0)?.id ?? null
    setSelectedId(nextSelectedId)
    if (!nextSelectedId) setIsDetailOpen(false)
  }, [explorer])

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

  const activeMode = explorer.mode
  const ActiveModeIcon = modeIcons[activeMode]
  const selectedHome = explorer.results.find((home) => home.id === selectedId)
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
          aria-label="ChiRoute home"
        >
          <span
            className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Building2 className="size-4" />
          </span>
          <span>ChiRoute</span>
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

            <div
              className="relative isolate h-[440px] overflow-hidden bg-muted sm:h-[520px] xl:h-[650px]"
              style={
                {
                  "--reach": `${22 + ((maxMinutes - 15) / 45) * 32}%`,
                } as React.CSSProperties
              }
              aria-label={`Stylized Chicago map showing ${explorer.results.length} reachable homes`}
            >
              <div
                className="absolute inset-y-0 right-[26%] left-0 [background-image:repeating-linear-gradient(0deg,transparent_0_37px,color-mix(in_oklch,var(--foreground)_15%,transparent)_38px_39px),repeating-linear-gradient(90deg,transparent_0_46px,color-mix(in_oklch,var(--foreground)_15%,transparent)_47px_48px)] opacity-40"
                aria-hidden="true"
              />
              <div
                className="absolute inset-y-0 right-0 w-[26%] overflow-hidden bg-sky-100 shadow-[-16px_0_25px_rgb(61_128_132_/_0.12)]"
                aria-hidden="true"
              >
                <span className="absolute top-[45%] left-[31%] text-[0.65rem] font-medium tracking-[0.18em] text-sky-800/50 [writing-mode:vertical-rl]">
                  LAKE MICHIGAN
                </span>
              </div>
              <div
                className="absolute top-[calc(65%-var(--reach)/2)] left-[calc(61%-var(--reach)/2)] aspect-square w-[var(--reach)] rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_0_18px_color-mix(in_oklch,var(--primary)_4%,transparent),0_0_0_38px_color-mix(in_oklch,var(--primary)_2%,transparent)] transition-all duration-300"
                aria-hidden="true"
              />
              <div
                className="absolute top-[-8%] left-[58%] h-[112%] w-[5px] origin-center rotate-[-5deg] rounded-full bg-red-600/70 shadow-[0_0_0_1px_rgb(255_255_255_/_0.6)]"
                aria-hidden="true"
              />
              <div
                className="absolute top-[17%] left-[42%] h-[90%] w-[5px] origin-center rotate-[-28deg] rounded-full bg-blue-600/70 shadow-[0_0_0_1px_rgb(255_255_255_/_0.6)]"
                aria-hidden="true"
              />
              <div
                className="absolute top-[59%] left-[54%] h-1 w-[38%] origin-center rotate-[8deg] rounded-full bg-green-600/70 shadow-[0_0_0_1px_rgb(255_255_255_/_0.6)]"
                aria-hidden="true"
              />
              <span className="absolute top-[20%] left-[47%] text-[0.6rem] font-medium tracking-widest text-muted-foreground">
                NORTH SIDE
              </span>
              <span className="absolute top-[55%] left-[19%] text-[0.6rem] font-medium tracking-widest text-muted-foreground">
                WEST SIDE
              </span>
              <span className="absolute top-[84%] left-[55%] text-[0.6rem] font-medium tracking-widest text-muted-foreground">
                SOUTH SIDE
              </span>
              <span className="absolute top-[59%] left-[61%] text-[0.6rem] font-medium tracking-widest text-foreground/70">
                THE LOOP
              </span>
              <div
                className="absolute top-[65%] left-[61%] grid -translate-x-1/2 -translate-y-1/2 place-items-center text-foreground"
                aria-label="Destination in The Loop"
              >
                <MapPin className="size-8 fill-amber-300 drop-shadow-sm" />
                <span className="absolute left-7 w-max rounded-md bg-card px-2 py-1 text-xs font-medium shadow-sm">
                  200 W Madison
                </span>
              </div>
              {explorer.results.map((home, index) => (
                <button
                  key={home.id}
                  type="button"
                  className="absolute grid min-w-10 -translate-x-1/2 -translate-y-1/2 animate-in cursor-pointer place-items-center fade-in slide-in-from-top-2 focus-visible:rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                  style={{
                    left: `${home.x}%`,
                    top: `${home.y}%`,
                    animationDelay: `${index * 45}ms`,
                  }}
                  onClick={(event) =>
                    openBuildingDetail(home.id, event.currentTarget)
                  }
                  aria-label={`${home.name}, ${home.neighborhood}, $${home.rent} rent, ${home.commute} minute commute`}
                  aria-pressed={selectedId === home.id}
                >
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full border-2 border-primary-foreground bg-primary text-primary-foreground shadow-sm transition-transform",
                      selectedId === home.id &&
                        "scale-110 ring-4 ring-primary/20",
                      explorer.winnerId === home.id && "bg-amber-600"
                    )}
                  >
                    {explorer.winnerId === home.id ? (
                      <Sparkles className="size-4" />
                    ) : (
                      <Building2 className="size-4" />
                    )}
                  </span>
                  <small className="mt-1 rounded bg-card px-1 py-0.5 text-[0.65rem] font-medium shadow-sm max-sm:hidden">
                    ${home.rent}
                  </small>
                </button>
              ))}
            </div>

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
              <p className="text-xs text-muted-foreground">Filter copilot</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              UI preview
            </Badge>
          </header>

          <Alert className="m-3 w-auto">
            <MessageSquareText />
            <AlertDescription>
              <strong>Not connected</strong> · Agent responses are not enabled.
            </AlertDescription>
          </Alert>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-1 lg:grid lg:grid-cols-2 xl:flex">
            <div className="flex items-start gap-2">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                aria-hidden="true"
              >
                <Bot className="size-3" />
              </span>
              <p className="rounded-lg bg-muted p-3 text-sm leading-6 text-muted-foreground">
                Chat will live here. A future housing agent will translate
                requests into the filters on the left.
              </p>
            </div>

            <section
              className="rounded-xl border p-4"
              aria-labelledby="active-summary-title"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 id="active-summary-title" className="text-sm font-medium">
                  Example request
                </h3>
                <span className="text-xs text-muted-foreground">
                  Static preview
                </span>
              </div>
              <blockquote className="text-sm leading-6 text-muted-foreground italic">
                “Show me quiet one-bedrooms near the train, and avoid reviews
                mentioning thin walls.”
              </blockquote>
              <p className="mt-3 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                <SlidersHorizontal className="size-3" aria-hidden="true" />
                Future chat requests will update the filter rail.
              </p>
            </section>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 border-t p-3">
            <Label htmlFor="agent-message" className="sr-only">
              Message the housing agent
            </Label>
            <Textarea
              id="agent-message"
              className="min-h-16 resize-none"
              placeholder="Ask for a neighborhood, commute, or review signal…"
              aria-describedby="composer-note"
              rows={2}
              disabled
            />
            <Button
              className="h-16"
              type="button"
              disabled
              aria-label="Send unavailable in UI preview"
            >
              <Send data-icon="inline-start" /> Send
            </Button>
            <p
              id="composer-note"
              className="col-span-full text-xs text-muted-foreground"
            >
              Preview only · no message will be sent.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
