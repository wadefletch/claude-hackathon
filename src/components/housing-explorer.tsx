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

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    <main className="explorer-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ChiRoute home">
          <span className="brand-mark" aria-hidden="true">
            <Building2 />
          </span>
          <span>ChiRoute</span>
        </a>
        <Badge variant="outline" className="city-badge">
          Chicago, IL
        </Badge>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">Affordable housing · commute explorer</p>
          <h1>Find a home that gets you there.</h1>
          <p className="hero-copy">
            Compare affordable homes across Chicago by commute time and monthly
            travel cost.
          </p>
        </div>
      </section>

      <div className="app-layout">
        <aside className="filter-rail" aria-label="Housing and commute filters">
          <div className="rail-heading">
            <span className="rail-heading-icon" aria-hidden="true">
              <SlidersHorizontal />
            </span>
            <div>
              <p className="eyebrow">Search controls</p>
              <h2>Filters</h2>
            </div>
          </div>

          <section
            className="filter-section"
            aria-labelledby="destination-label"
          >
            <h3 id="destination-label" className="control-label">
              Destination
            </h3>
            <div
              className="rail-destination"
              aria-label={`Destination: ${destination}`}
            >
              <span className="destination-icon">
                <MapPin />
              </span>
              <strong>{destination}</strong>
            </div>
          </section>

          <Separator />

          <section
            className="filter-section time-control"
            aria-labelledby="commute-label"
          >
            <div className="control-heading">
              <span id="commute-label">
                <Clock3 /> Maximum commute
              </span>
              <output aria-live="polite">{maxMinutes} min</output>
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
            <div className="slider-labels" aria-hidden="true">
              <span>15 min</span>
              <span>60 min</span>
            </div>
          </section>

          <Separator />

          <section
            className="filter-section mode-control"
            aria-labelledby="mode-label"
          >
            <h3 id="mode-label" className="control-label">
              Travel mode
            </h3>
            <ToggleGroup
              variant="outline"
              spacing={1}
              aria-label="Travel mode"
              className="mode-group"
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
                    className="mode-toggle"
                  >
                    <Icon />
                    <span>{modes[mode].label}</span>
                    <small>${modes[mode].monthlyCost}/mo</small>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </section>

          <Separator />

          <section
            className="filter-section optimize-control"
            aria-labelledby="optimize-label"
          >
            <h3 id="optimize-label" className="control-label">
              Optimize for
            </h3>
            <div className="optimizer-buttons">
              <Button
                variant={optimizer === "cheapest" ? "default" : "outline"}
                onClick={() => setOptimizer("cheapest")}
                aria-pressed={optimizer === "cheapest"}
              >
                <DollarSign /> Cheapest
              </Button>
              <Button
                variant={optimizer === "quickest" ? "default" : "outline"}
                onClick={() => setOptimizer("quickest")}
                aria-pressed={optimizer === "quickest"}
              >
                <Sparkles /> Quickest
              </Button>
            </div>
          </section>

          <Separator />

          <section className="filter-section" aria-labelledby="housing-label">
            <h3 id="housing-label" className="control-label">
              Housing filters
            </h3>
            <div
              className="future-filters"
              aria-describedby="future-filters-note"
            >
              {["Income eligibility", "Bedrooms", "Availability"].map(
                (filter) => (
                  <div key={filter}>
                    <span>{filter}</span>
                    <Badge variant="outline">Soon</Badge>
                  </div>
                )
              )}
            </div>
            <p id="future-filters-note" className="helper-copy">
              More housing criteria will appear here as the search grows.
            </p>
          </section>

        </aside>

        <section className="workspace" aria-label="Housing results and map">
          <div className="map-panel">
            <div className="map-toolbar">
              <div>
                <span className="live-dot" /> Commute area
                <small>
                  Within {maxMinutes} minutes by{" "}
                  {modes[activeMode].label.toLowerCase()}
                </small>
              </div>
              <Badge className="map-mode-badge">
                <ActiveModeIcon /> {modes[activeMode].label}
              </Badge>
            </div>
            <div
              className="chicago-map"
              style={
                {
                  "--reach": `${22 + ((maxMinutes - 15) / 45) * 32}%`,
                } as React.CSSProperties
              }
              aria-label={`Stylized Chicago map showing ${explorer.results.length} reachable homes`}
            >
              <div className="street-grid" aria-hidden="true" />
              <div className="lake" aria-hidden="true">
                <span>LAKE MICHIGAN</span>
              </div>
              <div className="commute-glow" aria-hidden="true" />
              <div className="cta-line red-line" aria-hidden="true" />
              <div className="cta-line blue-line" aria-hidden="true" />
              <div className="cta-line green-line" aria-hidden="true" />
              <span className="hood-label hood-north">NORTH SIDE</span>
              <span className="hood-label hood-west">WEST SIDE</span>
              <span className="hood-label hood-south">SOUTH SIDE</span>
              <span className="hood-label hood-loop">THE LOOP</span>
              <div
                className="destination-pin"
                aria-label="Destination in The Loop"
              >
                <MapPin />
                <span>200 W Madison</span>
              </div>
              {explorer.results.map((home, index) => (
                <button
                  key={home.id}
                  type="button"
                  className={cn(
                    "home-marker",
                    selectedId === home.id && "is-selected",
                    explorer.winnerId === home.id && "is-winner"
                  )}
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
                  <span>
                    {explorer.winnerId === home.id ? (
                      <Sparkles />
                    ) : (
                      <Building2 />
                    )}
                  </span>
                  <small>${home.rent}</small>
                </button>
              ))}
            </div>
            <div className="map-legend" aria-label="Map legend">
              <span>
                <i className="legend-home" /> Affordable home
              </span>
              <span>
                <i className="legend-destination" /> Destination
              </span>
              <span>
                <i className="legend-route" /> CTA routes
              </span>
            </div>
          </div>

          <aside className="results-panel" aria-live="polite">
            <div className="results-heading">
              <div>
                <p className="eyebrow">Matches</p>
                <h2>{heading}</h2>
              </div>
              <Badge variant="outline">{explorer.results.length}</Badge>
            </div>

            <div className="result-list">
              {explorer.results.length ? (
                explorer.results.map((home) => (
                  <Card
                    key={home.id}
                    className={cn(
                      "result-card",
                      selectedId === home.id && "is-selected"
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
                    <CardContent className="result-content">
                      <div className="result-topline">
                        <div>
                          <span className="neighborhood">
                            {home.neighborhood}
                          </span>
                          <h3>{home.name}</h3>
                          <p>{home.address}</p>
                        </div>
                        {explorer.winnerId === home.id && (
                          <Badge className="winner-badge">
                            <Sparkles /> Best match
                          </Badge>
                        )}
                      </div>
                      <div className="result-stats">
                        <div>
                          <strong>${home.rent.toLocaleString()}</strong>
                          <span>/ month rent</span>
                        </div>
                        <div>
                          <strong>
                            {home.beds === 0 ? "Studio" : `${home.beds} bed`}
                          </strong>
                          <span>floor plan</span>
                        </div>
                      </div>
                      <Separator />
                      <div className="commute-row">
                        <span>
                          <ActiveModeIcon /> {home.commute} min
                        </span>
                        <span>${home.monthlyCost}/mo travel</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="empty-state">
                  <span>
                    <MapPin />
                  </span>
                  <h3>No homes in range</h3>
                  <p>Increase your commute time or try a faster travel mode.</p>
                </div>
              )}
            </div>
            <p className="disclosure">
              Demo only · All listings, rents, and commute estimates are
              fictional.
            </p>
          </aside>
        </section>

        {isDetailOpen && selectedHome && reviewData && neighborhoodData && (
          <dialog
            ref={detailDialogRef}
            className="building-detail-dialog"
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
            <section className="building-detail">
              <header className="building-detail-header">
                <div>
                  <p className="eyebrow">Selected building</p>
                  <h2 id="building-detail-title">{selectedHome.name}</h2>
                  <p id="building-detail-description">
                    {selectedHome.address} · {selectedHome.neighborhood}
                  </p>
                </div>
                <div className="building-detail-actions">
                  <Badge variant="outline" className="detail-rent-badge">
                    ${selectedHome.rent.toLocaleString()}/mo
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="building-detail-close"
                    onClick={closeBuildingDetail}
                    aria-label={`Close details for ${selectedHome.name}`}
                  >
                    <X />
                  </Button>
                </div>
              </header>

              <div
                className="detail-tabs"
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

              <div className="building-detail-body">
                {detailTab === "overview" ? (
                  <div
                    id="building-panel-overview"
                    className="detail-tab-panel overview-panel"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="building-tab-overview"
                  >
                    <div className="overview-lede">
                      <span aria-hidden="true">
                        <Building2 />
                      </span>
                      <div>
                        <h3>A closer look at this match</h3>
                        <p>
                          {selectedHome.name} is an affordable home in{" "}
                          {selectedHome.neighborhood}, currently reachable
                          within your selected commute range.
                        </p>
                      </div>
                    </div>
                    <dl className="overview-stats">
                      <div>
                        <dt>Monthly rent</dt>
                        <dd>${selectedHome.rent.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt>Floor plan</dt>
                        <dd>
                          {selectedHome.beds === 0
                            ? "Studio"
                            : `${selectedHome.beds} bedroom`}
                        </dd>
                      </div>
                      <div>
                        <dt>{modes[activeMode].label} commute</dt>
                        <dd>{selectedHome.commute} minutes</dd>
                      </div>
                      <div>
                        <dt>Travel estimate</dt>
                        <dd>${selectedHome.monthlyCost}/month</dd>
                      </div>
                    </dl>
                    <aside className="housing-application-callout">
                      <div>
                        <h3>Interested in affordable housing?</h3>
                        <p>
                          The official CHA portal supports applications for
                          Public Housing, Project-Based Voucher, and
                          Project-Based Rental Assistance waitlists. Eligibility
                          and waitlist availability vary.
                        </p>
                      </div>
                      <a
                        href="https://applyonline.thecha.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Apply for housing on the CHA Waitlist Application portal (opens in a new tab)"
                      >
                        Apply for housing.
                        <ExternalLink aria-hidden="true" />
                      </a>
                    </aside>
                  </div>
                ) : detailTab === "neighborhood" ? (
                  <div
                    id="building-panel-neighborhood"
                    className="detail-tab-panel neighborhood-panel"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="building-tab-neighborhood"
                  >
                    <div className="neighborhood-intro">
                      <span className="neighborhood-kicker">
                        <MapPin aria-hidden="true" /> Neighborhood snapshot
                      </span>
                      <h3>{selectedHome.neighborhood}</h3>
                      <p>{neighborhoodData.overview}</p>
                    </div>
                    <div className="neighborhood-columns">
                      <section aria-labelledby="transit-heading">
                        <span aria-hidden="true">
                          <BusFront />
                        </span>
                        <div>
                          <h4 id="transit-heading">Transit access</h4>
                          <ul>
                            {neighborhoodData.transit.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </section>
                      <section aria-labelledby="essentials-heading">
                        <span aria-hidden="true">
                          <ShoppingBasket />
                        </span>
                        <div>
                          <h4 id="essentials-heading">Nearby essentials</h4>
                          <ul>
                            {neighborhoodData.essentials.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </section>
                    </div>
                    <dl className="neighborhood-facts">
                      {neighborhoodData.facts.map((fact) => (
                        <div key={fact.label}>
                          <dt>{fact.label}</dt>
                          <dd>{fact.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : (
                  <div
                    id="building-panel-reviews"
                    className="detail-tab-panel reviews-panel"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="building-tab-reviews"
                  >
                    <div className="review-summary-grid">
                      <div
                        className="aggregate-rating"
                        aria-label={`Overall rating ${reviewData.averageRating} out of 5 from ${reviewData.totalReviewCount} reviews`}
                      >
                        <span>Overall rating</span>
                        <strong>{reviewData.averageRating}</strong>
                        <div className="rating-stars" aria-hidden="true">
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star
                              key={index}
                              className={
                                index < Math.round(reviewData.averageRating)
                                  ? "is-filled"
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                        <small>
                          <UsersRound /> {reviewData.totalReviewCount} reviews
                        </small>
                      </div>
                      <div
                        className="source-summary"
                        aria-label="Ratings by source"
                      >
                        {reviewData.sources.map((source) => (
                          <div key={source.source}>
                            <span>{source.source}</span>
                            <strong>
                              <Star aria-hidden="true" /> {source.rating}
                            </strong>
                            <small>{source.reviewCount} reviews</small>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="review-card-grid">
                      {reviewData.reviews.map((review) => (
                        <article className="review-card" key={review.id}>
                          <header>
                            <div>
                              <span className="review-source">
                                {review.source}
                              </span>
                            </div>
                            <span
                              className="review-rating"
                              aria-label={`${review.rating} out of 5 stars`}
                            >
                              <Star aria-hidden="true" /> {review.rating}
                            </span>
                          </header>
                          <div className="review-byline">
                            <strong>{review.author}</strong>
                            <time dateTime={review.date}>{review.recency}</time>
                          </div>
                          <p>{review.text}</p>
                          <div
                            className="review-tags"
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

        <aside className="agent-panel" aria-labelledby="agent-title">
          <header className="agent-header">
            <span className="agent-avatar" aria-hidden="true">
              <Bot />
            </span>
            <div>
              <div className="agent-title-row">
                <h2 id="agent-title">Housing agent</h2>
                <span className="status-dot" aria-hidden="true" />
              </div>
              <p>Filter copilot</p>
            </div>
            <Badge variant="outline" className="preview-badge">
              UI preview
            </Badge>
          </header>

          <div className="agent-notice" role="status">
            <MessageSquareText aria-hidden="true" />
            <span>
              <strong>Not connected</strong> · Agent responses are not enabled.
            </span>
          </div>

          <div className="chat-thread">
            <div className="chat-message agent-message">
              <span className="message-avatar" aria-hidden="true">
                <Bot />
              </span>
              <p>
                Chat will live here. A future housing agent will translate
                requests into the filters on the left.
              </p>
            </div>

            <section
              className="active-summary"
              aria-labelledby="active-summary-title"
            >
              <div className="summary-heading">
                <h3 id="active-summary-title">Example request</h3>
                <span>Static preview</span>
              </div>
              <blockquote>
                “Show me quiet one-bedrooms near the train, and avoid reviews
                mentioning thin walls.”
              </blockquote>
              <p>
                <SlidersHorizontal aria-hidden="true" /> Future chat requests
                will update the filter rail.
              </p>
            </section>
          </div>

          <div className="chat-composer">
            <Label htmlFor="agent-message" className="sr-only">
              Message the housing agent
            </Label>
            <Textarea
              id="agent-message"
              placeholder="Ask for a neighborhood, commute, or review signal…"
              aria-describedby="composer-note"
              rows={2}
              disabled
            />
            <Button
              type="button"
              disabled
              aria-label="Send unavailable in UI preview"
            >
              <Send /> Send
            </Button>
            <p id="composer-note">Preview only · no message will be sent.</p>
          </div>
        </aside>
      </div>
    </main>
  )
}
