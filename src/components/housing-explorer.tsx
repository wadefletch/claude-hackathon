import { useEffect, useMemo, useState } from "react"
import {
  Bot,
  Building2,
  CarFront,
  Clock3,
  DollarSign,
  Footprints,
  MessageSquareText,
  MapPin,
  Navigation,
  Send,
  SlidersHorizontal,
  Sparkles,
  TrainFront,
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
  const [reviewWants, setReviewWants] = useState("")
  const [reviewAvoids, setReviewAvoids] = useState("")
  const explorer = useMemo(
    () =>
      optimizer
        ? getOptimizedResults(optimizer, maxMinutes)
        : getManualResults(manualMode, maxMinutes),
    [manualMode, maxMinutes, optimizer]
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedId(explorer.winnerId ?? explorer.results.at(0)?.id ?? null)
  }, [explorer])

  const selectManualMode = (mode: TravelMode) => {
    setManualMode(mode)
    setOptimizer(null)
  }

  const activeMode = explorer.mode
  const ActiveModeIcon = modeIcons[activeMode]
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
            Compare fictional affordable homes across Chicago by commute time
            and monthly travel cost.
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

          <Separator />

          <section
            className="filter-section review-preferences"
            aria-labelledby="reviews-label"
          >
            <h3 id="reviews-label" className="control-label">
              Review preferences
            </h3>
            <p id="reviews-help" className="helper-copy">
              Tell the future housing agent which signals to look for while
              reading resident reviews.
            </p>
            <div className="textarea-field">
              <Label htmlFor="review-wants">Want to see</Label>
              <Textarea
                id="review-wants"
                value={reviewWants}
                onChange={(event) => setReviewWants(event.target.value)}
                placeholder="Responsive management, quiet at night, reliable maintenance…"
                aria-describedby="reviews-help"
              />
            </div>
            <div className="textarea-field">
              <Label htmlFor="review-avoids">Want to avoid</Label>
              <Textarea
                id="review-avoids"
                value={reviewAvoids}
                onChange={(event) => setReviewAvoids(event.target.value)}
                placeholder="Thin walls, surprise fees, pests…"
                aria-describedby="reviews-help"
              />
            </div>
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
                  onClick={() => setSelectedId(home.id)}
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
                    onClick={() => setSelectedId(home.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setSelectedId(home.id)
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
