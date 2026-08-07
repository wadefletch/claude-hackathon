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
import type { AppMapHome, AppMapState } from "@/components/app-map"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  buildHomesFromDevelopments,
  destination,
  getManualResults,
  getOptimizedResults,
  MAX_RENT,
  MIN_RENT,
  modes,
} from "@/lib/housing-data"
import type { LatLng } from "@/lib/agent/geo"
import type { Optimizer, TravelMode } from "@/lib/housing-data"
import { getBuildingReviewData } from "@/lib/building-reviews"
import { getNeighborhoodSnapshot } from "@/lib/neighborhood-data"
import type { ShowMapInput } from "@/lib/agent/schemas"
import type {
  HousingDevelopment,
  ProfilePatch,
  TransportMode,
  WorkLocation,
} from "@/domain"
import { AgentMarkdown } from "@/components/agent-markdown"
import { cn } from "@/lib/utils"

const modeIcons = {
  train: TrainFront,
  walk: Footprints,
  drive: CarFront,
  rideshare: Navigation,
} satisfies Record<TravelMode, typeof TrainFront>

const DEFAULT_WORK_LOCATION = {
  label: destination,
  coordinates: [-87.633, 41.882] as [number, number],
}

// Bounds for the "Maximum commute" slider. Realistic transit trips start
// around 13-15 minutes even for the closest listings once the new access-time
// model is applied, so the floor sits at 15 and the ceiling stretches to 90 to
// still surface the far South/North Side listings Danielle is comparing.
const MIN_COMMUTE_MINUTES = 15
const MAX_COMMUTE_MINUTES = 90

// The agent's TransportMode is a superset of this demo's TravelMode (no
// "bike" here, so it falls back to "walk" as the closest non-motorized mode).
const AGENT_MODE_TO_TRAVEL_MODE: Record<TransportMode, TravelMode> = {
  transit: "train",
  car: "drive",
  walk: "walk",
  bike: "walk",
  rideshare: "rideshare",
}

export function HousingExplorer({
  developments,
}: {
  developments: HousingDevelopment[]
}) {
  const [maxMinutes, setMaxMinutes] = useState(35)
  const [maxRent, setMaxRent] = useState(MAX_RENT)
  const [manualMode, setManualMode] = useState<TravelMode>("train")
  const [optimizer, setOptimizer] = useState<Optimizer | null>(null)
  const [workLocation, setWorkLocation] = useState(DEFAULT_WORK_LOCATION)
  const [monthlyIncome, setMonthlyIncome] = useState(3600)
  const [bedsNeeded, setBedsNeeded] = useState(0)
  const [focusedNeighborhood, setFocusedNeighborhood] = useState<string | null>(
    null
  )
  const realHomes = useMemo(
    () => buildHomesFromDevelopments(developments),
    [developments]
  )
  // Left-panel eligibility filters narrow the set before commute filtering:
  // rent-to-income ≤ 30% (the affordability test) and enough bedrooms.
  const eligibleHomes = useMemo(
    () =>
      realHomes.filter(
        (home) =>
          (monthlyIncome <= 0 || home.rent / monthlyIncome <= 0.3) &&
          home.beds >= bedsNeeded
      ),
    [realHomes, monthlyIncome, bedsNeeded]
  )
  const workLatLng: LatLng = useMemo(
    () => ({
      lat: workLocation.coordinates[1],
      lng: workLocation.coordinates[0],
    }),
    [workLocation]
  )
  const explorer = useMemo(() => {
    const query = {
      maxMinutes,
      maxRent,
      work: workLatLng,
      homeList: eligibleHomes,
    }
    return optimizer
      ? getOptimizedResults(optimizer, query)
      : getManualResults(manualMode, query)
  }, [manualMode, maxMinutes, maxRent, optimizer, eligibleHomes, workLatLng])
  const activeMode = explorer.mode
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<
    "overview" | "reviews" | "neighborhood"
  >("overview")
  const detailDialogRef = useRef<HTMLDialogElement>(null)
  const detailTriggerRef = useRef<HTMLElement | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
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

  // The agent calls update_profile as soon as it learns something (often in
  // its very first reply) and only calls show_map once the whole multi-step
  // search finishes — which can take a while. Scanning every message for
  // either tool's output (not just the final show_map) means the sidebar
  // updates as soon as the agent knows the work location, not once the full
  // search is done.
  const latestAgentWorkLocation = useMemo(() => {
    let work: WorkLocation | undefined
    for (const message of chatMessages) {
      for (const part of message.parts) {
        if (
          part.type === "tool-update_profile" &&
          part.state === "output-available"
        ) {
          const patch = part.output as ProfilePatch
          const member = patch.members?.find((m) => m.work)
          if (member?.work) work = member.work
        }
        if (
          part.type === "tool-show_map" &&
          part.state === "output-available"
        ) {
          const payload = part.output as ShowMapInput
          const member = payload.profile.members.find((m) => m.work)
          if (member?.work) work = member.work
        }
      }
    }
    return work
  }, [chatMessages])

  // Reflect what the agent learned in the sidebar's own filter controls, so a
  // conversation like "I work at 200 W Madison and take the train" visibly
  // updates Destination/Maximum commute/Travel mode instead of only showing
  // up in the chat thread. Note: this syncs the *filter controls* — the
  // sidebar's home listings still come from the separate demo dataset, not
  // from the agent's own search results (those render inline in the chat).
  useEffect(() => {
    const work = latestAgentWorkLocation
    if (!work) return

    setManualMode(AGENT_MODE_TO_TRAVEL_MODE[work.preferredMode])
    setOptimizer(null)
    if (work.maxCommuteMinutes) {
      setMaxMinutes(work.maxCommuteMinutes)
    }
    setWorkLocation({
      label: work.label ?? work.address ?? DEFAULT_WORK_LOCATION.label,
      coordinates: [work.lng, work.lat],
    })
  }, [latestAgentWorkLocation])

  // Once the agent has results, they take over the map and Matches list —
  // the filter-driven explorer.results stays untouched underneath so
  // switching back is lossless, it's just not what's displayed.
  const agentMatches = latestShowMapOutput?.matches ?? []
  const isAgentDriven = agentMatches.length > 0

  useEffect(() => {
    if (isAgentDriven) return
    if (explorer.results.some((home) => home.id === selectedId)) return

    const nextSelectedId =
      explorer.winnerId ?? explorer.results.at(0)?.id ?? null
    setSelectedId(nextSelectedId)
    if (!nextSelectedId) setIsDetailOpen(false)
  }, [explorer, isAgentDriven])

  // Highlight the agent's top-ranked match whenever a new (or refined) set
  // of results comes in, so the list/map selection tracks the latest answer.
  useEffect(() => {
    if (agentMatches.length === 0) return
    setSelectedId(agentMatches[0].housing.id)
  }, [agentMatches])

  useEffect(() => {
    const dialog = detailDialogRef.current
    if (isDetailOpen && dialog && !dialog.open) dialog.showModal()
  }, [isDetailOpen, selectedId])

  // Keep the chat thread pinned to the latest content — new messages and
  // streamed tokens both update `chatMessages`, so this fires continuously
  // while the agent is replying, not just when a full message completes.
  useEffect(() => {
    const container = chatScrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [chatMessages])

  const openBuildingDetail = (id: string, trigger: HTMLElement) => {
    detailTriggerRef.current = trigger
    setSelectedId(id)
    setDetailTab("overview")
    setIsDetailOpen(true)
  }

  // Agent-driven matches don't have the demo review/neighborhood data the
  // detail dialog is built around, so selecting one just highlights it on
  // the map and in the list instead of opening that dialog.
  const handleHomeSelect = (id: string, trigger: HTMLElement) => {
    if (isAgentDriven) {
      setSelectedId(id)
      return
    }
    openBuildingDetail(id, trigger)
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

  const submitChatMessage = () => {
    if (!chatInput.trim() || chatStatus === "streaming") return
    sendChatMessage({ text: chatInput })
    setChatInput("")
  }

  const ActiveModeIcon = modeIcons[activeMode]
  const selectedHome = explorer.results.find((home) => home.id === selectedId)
  const mapHomes = useMemo<AppMapHome[]>(() => {
    if (isAgentDriven) {
      return agentMatches.map((match) => ({
        id: match.housing.id,
        label: match.housing.communityArea
          ? `${match.housing.propertyName} · ${match.housing.communityArea}`
          : match.housing.propertyName,
        coordinates: [match.housing.location.lng, match.housing.location.lat],
        rent: match.rentUsd,
      }))
    }
    return explorer.results.map((home) => ({
      id: home.id,
      label: `${home.name} · ${home.neighborhood}`,
      coordinates: home.coordinates,
      rent: home.rent,
    }))
  }, [agentMatches, isAgentDriven, explorer.results])
  // Aggregate the reachable homes into one bubble per community area (centroid
  // + count) for the zoomed-out hybrid map view. Skipped for agent matches —
  // it's a short curated list, individual pins read better than bubbles.
  const neighborhoodGroups = useMemo(() => {
    if (isAgentDriven) return []
    const groups = new Map<
      string,
      { sumLng: number; sumLat: number; count: number; homeIds: string[] }
    >()
    for (const home of explorer.results) {
      const name = home.neighborhood || "Chicago"
      const group = groups.get(name) ?? {
        sumLng: 0,
        sumLat: 0,
        count: 0,
        homeIds: [],
      }
      group.sumLng += home.coordinates[0]
      group.sumLat += home.coordinates[1]
      group.count += 1
      group.homeIds.push(home.id)
      groups.set(name, group)
    }
    return [...groups.entries()].map(([name, group]) => ({
      name,
      coordinates: [group.sumLng / group.count, group.sumLat / group.count] as [
        number,
        number,
      ],
      count: group.count,
      homeIds: group.homeIds,
    }))
  }, [isAgentDriven, explorer.results])
  const mapState = useMemo<AppMapState>(
    () => ({
      homes: mapHomes,
      neighborhoodGroups,
      work: workLocation,
      selectedHomeId: selectedId,
      winnerId: isAgentDriven
        ? (agentMatches[0]?.housing.id ?? null)
        : explorer.winnerId,
      isochrone:
        activeMode === "walk"
          ? undefined
          : {
              origin: workLocation,
              mode: activeMode === "train" ? "transit" : "drive",
              minutes: maxMinutes,
            },
    }),
    [
      activeMode,
      agentMatches,
      isAgentDriven,
      explorer.winnerId,
      mapHomes,
      neighborhoodGroups,
      maxMinutes,
      selectedId,
      workLocation,
    ]
  )
  const reviewData = selectedHome ? getBuildingReviewData(selectedHome) : null
  const neighborhoodData = selectedHome
    ? getNeighborhoodSnapshot(selectedHome.id, selectedHome.neighborhood)
    : null

  // Clicking a neighborhood bubble focuses the Matches list on that group.
  // Drop focus if a filter change removed the neighborhood from the results.
  useEffect(() => {
    if (
      focusedNeighborhood &&
      !explorer.results.some(
        (home) => home.neighborhood === focusedNeighborhood
      )
    ) {
      setFocusedNeighborhood(null)
    }
  }, [explorer.results, focusedNeighborhood])

  const displayedResults = focusedNeighborhood
    ? explorer.results.filter(
        (home) => home.neighborhood === focusedNeighborhood
      )
    : explorer.results
  const agentMatchCount = agentMatches.length
  const heading = isAgentDriven
    ? `${agentMatchCount} agent ${agentMatchCount === 1 ? "match" : "matches"}`
    : optimizer
      ? optimizer === "cheapest"
        ? "Best value match"
        : "Fastest match"
      : focusedNeighborhood
        ? focusedNeighborhood
        : `${explorer.results.length} reachable ${explorer.results.length === 1 ? "home" : "homes"}`

  return (
    <main className="flex h-svh min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <div className="min-h-0 flex-1 overflow-hidden" id="top">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel
            id="search-controls"
            defaultSize="24%"
            minSize="280px"
          >
            <aside
              className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background"
              aria-label="Housing and commute filters"
            >
              <div className="flex h-16 shrink-0 items-center border-b px-4">
                <img
                  src="/qualifind-logo.svg"
                  alt="QualiFind"
                  className="h-10 w-auto"
                />
              </div>
              <Tabs
                defaultValue="filters"
                className="flex h-full min-h-0 flex-col gap-0"
              >
                <TabsList className="m-3 shrink-0">
                  <TabsTrigger value="filters">
                    <SlidersHorizontal data-icon="inline-start" /> Filters
                  </TabsTrigger>
                  <TabsTrigger value="agent">
                    <Bot data-icon="inline-start" /> Agent
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="filters"
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4"
                >
                  <section className="py-4" aria-labelledby="destination-label">
                    <h3
                      id="destination-label"
                      className="mb-3 text-xs font-medium text-muted-foreground"
                    >
                      Destination
                    </h3>
                    <div
                      className="flex items-center gap-3"
                      aria-label={`Destination: ${workLocation.label}`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <MapPin className="size-4" />
                      </span>
                      <strong className="text-sm leading-snug font-medium">
                        {workLocation.label}
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
                        <Clock3 className="size-4 text-muted-foreground" />{" "}
                        Maximum commute
                      </span>
                      <output className="tabular-nums" aria-live="polite">
                        {maxMinutes} min
                      </output>
                    </div>
                    <Slider
                      aria-label="Maximum commute time in minutes"
                      min={MIN_COMMUTE_MINUTES}
                      max={MAX_COMMUTE_MINUTES}
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
                      <span>{MIN_COMMUTE_MINUTES} min</span>
                      <span>{MAX_COMMUTE_MINUTES} min</span>
                    </div>
                  </section>

                  <Separator />

                  <section className="py-4" aria-labelledby="rent-label">
                    <div className="mb-3 flex items-center justify-between gap-4 text-sm font-medium">
                      <span
                        id="rent-label"
                        className="inline-flex items-center gap-2"
                      >
                        <DollarSign className="size-4 text-muted-foreground" />{" "}
                        Maximum rent
                      </span>
                      <output className="tabular-nums" aria-live="polite">
                        ${maxRent.toLocaleString()}/mo
                      </output>
                    </div>
                    <Slider
                      aria-label="Maximum monthly rent in dollars"
                      min={MIN_RENT}
                      max={MAX_RENT}
                      step={25}
                      value={[maxRent]}
                      onValueChange={(value) =>
                        setMaxRent(Array.isArray(value) ? value[0] : value)
                      }
                    />
                    <div
                      className="mt-2 flex justify-between text-xs text-muted-foreground"
                      aria-hidden="true"
                    >
                      <span>${MIN_RENT.toLocaleString()}</span>
                      <span>${MAX_RENT.toLocaleString()}</span>
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
                    {/* Controlled by activeMode (not manualMode) so that picking a
                        "Optimize for" preset, which resolves to a travel mode of
                        its own, highlights that mode here too. */}
                    <ToggleGroup
                      variant="outline"
                      orientation="vertical"
                      spacing={1}
                      aria-label="Travel mode"
                      className="w-full"
                      value={[activeMode]}
                      onValueChange={(value) => {
                        // Deselecting the active mode yields an empty array; keep
                        // the current mode rather than leaving nothing selected.
                        const next = value.at(-1) as TravelMode | undefined
                        if (next) selectManualMode(next)
                      }}
                    >
                      {(Object.keys(modes) as TravelMode[]).map((mode) => {
                        const Icon = modeIcons[mode]
                        return (
                          <ToggleGroupItem
                            key={mode}
                            value={mode}
                            className="w-full justify-start"
                          >
                            <Icon data-icon="inline-start" />
                            <span className="truncate">
                              {modes[mode].label}
                            </span>
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
                        variant={
                          optimizer === "cheapest" ? "default" : "outline"
                        }
                        onClick={() => setOptimizer("cheapest")}
                        aria-pressed={optimizer === "cheapest"}
                      >
                        <DollarSign data-icon="inline-start" /> Cheapest
                      </Button>
                      <Button
                        className="w-full justify-start"
                        variant={
                          optimizer === "quickest" ? "default" : "outline"
                        }
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
                    <div className="flex flex-col gap-4">
                      <div>
                        <Label
                          htmlFor="income"
                          className="mb-2 inline-flex items-center gap-2 text-sm font-medium"
                        >
                          <DollarSign className="size-4 text-muted-foreground" />{" "}
                          Monthly income
                        </Label>
                        <Input
                          id="income"
                          type="number"
                          min={0}
                          step={100}
                          value={monthlyIncome || ""}
                          onChange={(event) =>
                            setMonthlyIncome(Number(event.target.value) || 0)
                          }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {monthlyIncome > 0
                            ? `Shows homes with rent ≤ $${Math.round(
                                monthlyIncome * 0.3
                              ).toLocaleString()}/mo (30% of income).`
                            : "Enter income to filter by affordability."}
                        </p>
                      </div>

                      <div>
                        <h4 className="mb-2 text-sm font-medium">Bedrooms</h4>
                        <ToggleGroup
                          variant="outline"
                          spacing={1}
                          aria-label="Minimum bedrooms"
                          className="w-full"
                        >
                          {[
                            { value: 0, label: "Any" },
                            { value: 1, label: "1+" },
                            { value: 2, label: "2+" },
                            { value: 3, label: "3+" },
                          ].map((option) => (
                            <ToggleGroupItem
                              key={option.value}
                              value={String(option.value)}
                              pressed={bedsNeeded === option.value}
                              onPressedChange={(pressed) =>
                                pressed && setBedsNeeded(option.value)
                              }
                              className="flex-1"
                            >
                              {option.label}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-dashed p-2 text-sm text-muted-foreground">
                        <span>Availability</span>
                        <Badge variant="outline">Soon</Badge>
                      </div>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent
                  value="agent"
                  className="flex min-h-0 flex-1 flex-col"
                  aria-labelledby="agent-title"
                >
                  <p
                    id="agent-title"
                    className="shrink-0 px-4 pb-2 text-xs text-muted-foreground"
                  >
                    Ask about commute, budget, or eligibility
                  </p>

                  <div
                    ref={chatScrollRef}
                    className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4"
                  >
                    {chatMessages.length === 0 && (
                      <div className="flex items-start gap-2">
                        <span
                          className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                          aria-hidden="true"
                        >
                          <Bot className="size-3" />
                        </span>
                        <div className="flex flex-col items-start gap-2">
                          <p className="rounded-lg bg-muted p-3 text-sm leading-6 text-foreground">
                            Tell me about your commute, budget, and household —
                            or check whether you qualify for affordable housing.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={chatStatus === "streaming"}
                            onClick={() =>
                              sendChatMessage({ text: "See if I qualify" })
                            }
                          >
                            <SearchCheck data-icon="inline-start" /> See if I
                            qualify
                          </Button>
                        </div>
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
                                <div
                                  key={`${message.id}-${index}`}
                                  className={cn(
                                    "rounded-lg p-3 text-sm",
                                    message.role === "user"
                                      ? "ml-auto max-w-[85%] bg-primary text-primary-foreground"
                                      : "max-w-[85%] bg-muted text-foreground"
                                  )}
                                >
                                  <AgentMarkdown>{part.text}</AgentMarkdown>
                                </div>
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
                                          <div className="mt-2">
                                            <AgentMarkdown>
                                              {match.rationale}
                                            </AgentMarkdown>
                                          </div>
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
                    className="grid shrink-0 grid-cols-[1fr_auto] gap-2 border-t p-3"
                    onSubmit={(event) => {
                      event.preventDefault()
                      submitChatMessage()
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
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault()
                          submitChatMessage()
                        }
                      }}
                      placeholder="Message the housing agent"
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
                </TabsContent>
              </Tabs>
            </aside>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel id="commute-map" defaultSize="52%" minSize="360px">
            <section
              className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background"
              aria-label="Commute map"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b px-4 text-sm font-medium">
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
                <div className="flex items-center gap-2">
                  <Badge>
                    <ActiveModeIcon /> {modes[activeMode].label}
                  </Badge>
                </div>
              </div>

              <AppMap
                className="min-h-0 flex-1 rounded-none border-0 shadow-none"
                state={mapState}
                onHomeSelect={(home, trigger) =>
                  handleHomeSelect(home.id, trigger)
                }
                onNeighborhoodSelect={setFocusedNeighborhood}
              />

              <div
                className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t px-4 py-2 text-xs text-muted-foreground"
                aria-label="Map legend"
              >
                <span className="inline-flex items-center gap-2">
                  <i className="size-2 rounded-full bg-primary" /> Affordable
                  home
                </span>
                <span className="inline-flex items-center gap-2">
                  <i className="size-2 rounded-full bg-amber-600" /> Destination
                </span>
                <span className="inline-flex items-center gap-2">
                  <i className="h-1 w-3 rounded-full bg-blue-600" /> CTA routes
                </span>
              </div>
            </section>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            id="housing-matches"
            defaultSize="24%"
            minSize="280px"
          >
            <aside
              className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background"
              aria-live="polite"
            >
              <div className="flex min-h-16 shrink-0 items-center justify-between border-b px-4">
                <div>
                  <p className="text-xs text-muted-foreground">Matches</p>
                  <h2 className="flex items-center gap-2 font-medium">
                    {heading}
                    {focusedNeighborhood && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs"
                        onClick={() => setFocusedNeighborhood(null)}
                      >
                        Clear <X className="size-3" />
                      </Button>
                    )}
                  </h2>
                </div>
                <Badge variant="outline">
                  {isAgentDriven ? agentMatchCount : displayedResults.length}
                </Badge>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
                {isAgentDriven ? (
                  agentMatches.map((match, index) => {
                    const workRoute = match.routes.find(
                      (route) => route.purpose === "work"
                    )
                    return (
                      <Card
                        key={match.housing.id}
                        className={cn(
                          "shrink-0 cursor-pointer",
                          selectedId === match.housing.id &&
                            "ring-2 ring-primary"
                        )}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selectedId === match.housing.id}
                        onClick={(event) =>
                          handleHomeSelect(
                            match.housing.id,
                            event.currentTarget
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            handleHomeSelect(
                              match.housing.id,
                              event.currentTarget
                            )
                          }
                        }}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <CardDescription className="truncate">
                                {match.housing.communityArea ??
                                  match.housing.propertyName}
                              </CardDescription>
                              <CardTitle>
                                {match.housing.propertyName}
                              </CardTitle>
                            </div>
                            {index === 0 && (
                              <Badge className="shrink-0">
                                <Sparkles /> Top match
                              </Badge>
                            )}
                          </div>
                          <CardDescription>
                            {match.housing.address}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                          {(match.rentUsd ?? match.bedrooms) !== undefined && (
                            <dl className="grid grid-cols-2 divide-x">
                              <div className="pr-3">
                                <dt className="text-xs text-muted-foreground">
                                  Monthly rent
                                </dt>
                                <dd className="mt-1 font-medium">
                                  {match.rentUsd
                                    ? `$${match.rentUsd.toLocaleString()}`
                                    : "Ask"}
                                </dd>
                              </div>
                              <div className="pl-3">
                                <dt className="text-xs text-muted-foreground">
                                  Floor plan
                                </dt>
                                <dd className="mt-1 font-medium">
                                  {match.bedrooms === undefined
                                    ? "Ask"
                                    : match.bedrooms === 0
                                      ? "Studio"
                                      : `${match.bedrooms} bed`}
                                </dd>
                              </div>
                            </dl>
                          )}
                          {workRoute && (
                            <p className="text-xs text-muted-foreground">
                              {workRoute.durationMinutes} min by{" "}
                              {workRoute.mode} to work
                            </p>
                          )}
                          <AgentMarkdown>{match.rationale}</AgentMarkdown>
                        </CardContent>
                      </Card>
                    )
                  })
                ) : displayedResults.length ? (
                  displayedResults.map((home) => (
                    <Card
                      key={home.id}
                      className={cn(
                        "shrink-0 cursor-pointer",
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
                          <ActiveModeIcon className="size-4" /> {home.commute}{" "}
                          min
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
                        Increase your commute time, raise your rent limit, or
                        try a faster travel mode.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
              <p className="shrink-0 border-t px-4 py-3 text-center text-xs text-muted-foreground">
                Demo only · All listings, rents, and commute estimates are
                fictional.
              </p>
            </aside>
          </ResizablePanel>
        </ResizablePanelGroup>

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
      </div>
    </main>
  )
}
