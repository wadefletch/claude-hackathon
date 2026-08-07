import { useEffect, useMemo, useState } from "react"
import {
  Building2,
  CarFront,
  Clock3,
  DollarSign,
  Footprints,
  MapPin,
  Navigation,
  Sparkles,
  TrainFront,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
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
        <div
          className="destination-card"
          aria-label={`Destination: ${destination}`}
        >
          <span className="destination-icon">
            <MapPin />
          </span>
          <span>
            <small>Your destination</small>
            <strong>{destination}</strong>
          </span>
        </div>
      </section>

      <section className="control-panel" aria-label="Commute filters">
        <div className="time-control">
          <div className="control-heading">
            <span>
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
        </div>

        <Separator orientation="vertical" className="control-separator" />

        <div className="mode-control">
          <span className="control-label">Travel mode</span>
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
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
        </div>

        <Separator orientation="vertical" className="control-separator" />

        <div className="optimize-control">
          <span className="control-label">Optimize for</span>
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
        </div>
      </section>

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
                  {explorer.winnerId === home.id ? <Sparkles /> : <Building2 />}
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
    </main>
  )
}
