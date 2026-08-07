# Chicago Housing Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire a working Vercel AI SDK tool-calling agent into the existing `HousingExplorer` UI, so the "Not connected" chat panel becomes a real Claude-backed assistant that asks clarifying questions, calls stubbed data/routing/eligibility tools, and calls a `show_map` tool with ranked results.

**Architecture:** A single TanStack Start API route (`src/routes/api/chat.ts`) runs `streamText` with six tools against Claude. Five tools (`geocodeWorkAddress`, `computeCommute`, `searchListings`, `nearbyAmenities`, `assessEligibility`) are stubs backed by fixture data derived from the existing `housing-data.ts` demo dataset plus a small geo-math helper — they get swapped for Wade's and Justin's real implementations later without changing the route or prompt. The sixth, `show_map`, is the agent's own "final answer" tool: the model assembles the ranked payload itself and calls it once. No custom state machine — a system prompt plus tool availability drives all branching (clarify vs. search vs. show vs. eligibility).

**Tech Stack:** Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`), Zod, TanStack Start file-based API routes, Vitest.

## Global Constraints

- Tool boundary: only `show_map` is implemented for real logic beyond fixtures; `geocodeWorkAddress` and `computeCommute` are placeholders for Wade's routing work, `searchListings` and `nearbyAmenities` are placeholders for Justin's data, per `docs/superpowers/specs/2026-08-07-agent-design.md`.
- `travelMode` is exactly `"walk" | "bike" | "bus" | "train" | "car"` — do not reuse `housing-data.ts`'s `TravelMode` (`train | walk | drive | rideshare`), which is a separate, unrelated placeholder type from the pre-agent demo.
- Rent-to-income ratio is plain arithmetic the model performs itself when constructing the `show_map` call — it is not a tool.
- `show_map` must never be gated by eligibility outcome; the agent always offers ranked housing regardless of the self-reported AMI tier.
- Eligibility profile fields (`annualHouseholdIncome`, `receivesBenefits`, `citizenshipStatus`) are never persisted outside the chat session — no new storage is introduced in this plan.
- The AMI limit figures in the fixtures are explicitly flagged as unverified placeholders pending real numbers from Lydia — do not present them as authoritative.
- `ANTHROPIC_API_KEY` is a secret sourced from Delores/foundation — it goes in a local, gitignored `.env`, never committed, never hardcoded.
- The design spec's "shared app state" handoff for `show_map` assumes a real map component exists to subscribe to it. Wade's MapLibre integration doesn't exist yet — the current "map" in `HousingExplorer` is a decorative CSS-only placeholder driven by slider state, not a real map. This plan renders `show_map`'s result directly inside the chat thread instead of introducing a new store with no consumer. Revisit the shared-state handoff once the real map component lands.

---

### Task 1: Dependencies, env template, and shared schemas

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `src/lib/agent/schemas.ts`
- Test: `src/lib/agent/schemas.test.ts`

**Interfaces:**
- Produces: `filterQuerySchema`, `eligibilityProfileSchema`, `listingSchema`, `amenitySchema`, `rankedListingSchema`, `showMapInputSchema` (Zod schemas), and their inferred types `FilterQuery`, `EligibilityProfile`, `Listing`, `Amenity`, `RankedListing`, `ShowMapInput` — used by Tasks 3, 4, 6.

- [ ] **Step 1: Install the AI SDK packages**

Run: `pnpm add ai @ai-sdk/react @ai-sdk/anthropic zod`

- [ ] **Step 2: Add the env template**

Create `.env.example`:

```
ANTHROPIC_API_KEY=
```

Copy it to a local `.env` (already gitignored via the repo's `.env*` rule) and fill in a real key before Task 6's manual verification.

- [ ] **Step 3: Write the failing test**

Create `src/lib/agent/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import {
  amenitySchema,
  eligibilityProfileSchema,
  filterQuerySchema,
  listingSchema,
  rankedListingSchema,
  showMapInputSchema,
} from "./schemas"

describe("agent schemas", () => {
  it("parses a valid filter query", () => {
    const result = filterQuerySchema.parse({
      workAddress: "200 W Madison St, Chicago, IL",
      maxCommuteMinutes: 35,
      travelMode: "train",
      optimizeFor: "time",
      householdSize: 3,
      numKids: 1,
      kidsAges: [7],
    })
    expect(result.travelMode).toBe("train")
  })

  it("rejects an invalid travel mode", () => {
    expect(() =>
      filterQuerySchema.parse({
        workAddress: "200 W Madison St, Chicago, IL",
        maxCommuteMinutes: 35,
        travelMode: "spaceship",
        optimizeFor: "time",
        householdSize: 3,
        numKids: 1,
        kidsAges: [7],
      })
    ).toThrow()
  })

  it("allows an eligibility profile with no fields set", () => {
    expect(eligibilityProfileSchema.parse({})).toEqual({})
  })

  it("parses a full show_map input payload", () => {
    const listing = listingSchema.parse({
      id: "loop",
      address: "520 S Dearborn St",
      lat: 41.8756,
      lng: -87.6294,
      price: 1340,
      bedrooms: 0,
      bathrooms: 1,
      neighborhood: "The Loop",
    })
    const amenity = amenitySchema.parse({
      id: "loop-grocery",
      type: "grocery",
      name: "Loop Market",
      lat: 41.8786,
      lng: -87.6298,
    })
    const rankedListing = rankedListingSchema.parse({
      listing,
      commute: { distanceMiles: 1.2, durationMinutes: 8, mode: "walk" },
      nearbyAmenities: [amenity],
      rationale: "Closest walk to work with a grocery store nearby.",
    })
    const payload = showMapInputSchema.parse({
      filters: {
        workAddress: "200 W Madison St, Chicago, IL",
        maxCommuteMinutes: 35,
        travelMode: "walk",
        optimizeFor: "time",
        householdSize: 1,
        numKids: 0,
        kidsAges: [],
      },
      rankedListings: [rankedListing],
    })
    expect(payload.rankedListings).toHaveLength(1)
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/agent/schemas.test.ts`
Expected: FAIL — `./schemas` cannot be found.

- [ ] **Step 5: Implement the schemas**

Create `src/lib/agent/schemas.ts`:

```ts
import { z } from "zod"

export const travelModeSchema = z.enum(["walk", "bike", "bus", "train", "car"])

export const filterQuerySchema = z.object({
  workAddress: z.string(),
  maxCommuteMinutes: z.number(),
  travelMode: travelModeSchema,
  optimizeFor: z.enum(["cost", "time"]),
  householdSize: z.number(),
  numKids: z.number(),
  kidsAges: z.array(z.number()),
  budgetMax: z.number().optional(),
  notes: z.string().optional(),
})

export const eligibilityProfileSchema = z.object({
  annualHouseholdIncome: z.number().optional(),
  receivesBenefits: z
    .array(z.enum(["SNAP", "Medicaid", "Medicare"]))
    .optional(),
  citizenshipStatus: z
    .enum(["citizen", "non-citizen", "prefer-not-to-say"])
    .optional(),
})

export const listingSchema = z.object({
  id: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  price: z.number(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  neighborhood: z.string(),
  sqft: z.number().optional(),
})

export const amenitySchema = z.object({
  id: z.string(),
  type: z.enum(["park", "school", "grocery"]),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
})

export const rankedListingSchema = z.object({
  listing: listingSchema,
  commute: z.object({
    distanceMiles: z.number(),
    durationMinutes: z.number(),
    mode: travelModeSchema,
  }),
  nearbyAmenities: z.array(amenitySchema),
  rentToIncomeRatio: z.number().optional(),
  rationale: z.string(),
})

export const showMapInputSchema = z.object({
  filters: filterQuerySchema,
  rankedListings: z.array(rankedListingSchema),
})

export type FilterQuery = z.infer<typeof filterQuerySchema>
export type EligibilityProfile = z.infer<typeof eligibilityProfileSchema>
export type Listing = z.infer<typeof listingSchema>
export type Amenity = z.infer<typeof amenitySchema>
export type RankedListing = z.infer<typeof rankedListingSchema>
export type ShowMapInput = z.infer<typeof showMapInputSchema>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/agent/schemas.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example src/lib/agent/schemas.ts src/lib/agent/schemas.test.ts
git commit -m "feat(agent): add AI SDK deps and shared zod schemas"
```

---

### Task 2: Geo math helper (distance + commute time estimate)

**Files:**
- Create: `src/lib/agent/geo.ts`
- Test: `src/lib/agent/geo.test.ts`

**Interfaces:**
- Produces: `LatLng` type, `haversineMiles(a, b)`, `estimateDurationMinutes(distanceMiles, mode)` — used by Task 4's `computeCommute` and `nearbyAmenities` tools.

- [ ] **Step 1: Write the failing test**

Create `src/lib/agent/geo.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { estimateDurationMinutes, haversineMiles } from "./geo"

describe("geo utilities", () => {
  it("computes distance between The Loop and Hyde Park within known bounds", () => {
    const loop = { lat: 41.8825, lng: -87.6339 }
    const hydePark = { lat: 41.7943, lng: -87.5907 }
    const miles = haversineMiles(loop, hydePark)
    expect(miles).toBeGreaterThan(6)
    expect(miles).toBeLessThan(8)
  })

  it("returns zero distance for identical points", () => {
    const point = { lat: 41.88, lng: -87.63 }
    expect(haversineMiles(point, point)).toBe(0)
  })

  it("estimates a longer duration for walking than driving over the same distance", () => {
    const walkMinutes = estimateDurationMinutes(5, "walk")
    const carMinutes = estimateDurationMinutes(5, "car")
    expect(walkMinutes).toBeGreaterThan(carMinutes)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/agent/geo.test.ts`
Expected: FAIL — `./geo` cannot be found.

- [ ] **Step 3: Implement the helper**

Create `src/lib/agent/geo.ts`:

```ts
export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_MILES = 3958.8

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h))
}

const AVERAGE_SPEED_MPH = {
  walk: 3,
  bike: 10,
  bus: 12,
  train: 20,
  car: 25,
} as const

export type TravelMode = keyof typeof AVERAGE_SPEED_MPH

export function estimateDurationMinutes(
  distanceMiles: number,
  mode: TravelMode
): number {
  return Math.round((distanceMiles / AVERAGE_SPEED_MPH[mode]) * 60)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/agent/geo.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/geo.ts src/lib/agent/geo.test.ts
git commit -m "feat(agent): add haversine distance and commute time estimate helpers"
```

---

### Task 3: Fixture data (stub listings, amenities, AMI table)

**Files:**
- Create: `src/lib/agent/fixtures.ts`
- Test: `src/lib/agent/fixtures.test.ts`

**Interfaces:**
- Consumes: `homes` from `src/lib/housing-data.ts` (existing); `listingSchema`, `amenitySchema`, `Listing`, `Amenity` from Task 1's `src/lib/agent/schemas.ts`.
- Produces: `FIXTURE_LISTINGS: Listing[]`, `FIXTURE_AMENITIES: Amenity[]`, `amiLimitForHouseholdSize(householdSize: number): number` — used by Task 4's tools.

- [ ] **Step 1: Write the failing test**

Create `src/lib/agent/fixtures.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { amiLimitForHouseholdSize, FIXTURE_AMENITIES, FIXTURE_LISTINGS } from "./fixtures"

describe("agent fixtures", () => {
  it("gives every fixture listing real-looking Chicago coordinates", () => {
    expect(FIXTURE_LISTINGS.length).toBeGreaterThan(0)
    for (const listing of FIXTURE_LISTINGS) {
      expect(listing.lat).toBeGreaterThan(41.6)
      expect(listing.lat).toBeLessThan(42.1)
      expect(listing.lng).toBeGreaterThan(-87.9)
      expect(listing.lng).toBeLessThan(-87.5)
    }
  })

  it("includes all three amenity types", () => {
    const types = new Set(FIXTURE_AMENITIES.map((a) => a.type))
    expect(types).toEqual(new Set(["park", "school", "grocery"]))
  })

  it("scales the AMI limit up with household size", () => {
    const single = amiLimitForHouseholdSize(1)
    const family = amiLimitForHouseholdSize(4)
    expect(family).toBeGreaterThan(single)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/agent/fixtures.test.ts`
Expected: FAIL — `./fixtures` cannot be found.

- [ ] **Step 3: Implement the fixtures**

Create `src/lib/agent/fixtures.ts`:

```ts
import { homes } from "@/lib/housing-data"

import { amenitySchema, listingSchema } from "@/lib/agent/schemas"
import type { Amenity, Listing } from "@/lib/agent/schemas"

// housing-data.ts's `homes` only carries synthetic x/y percentages for the
// CSS demo map. This maps each of its neighborhoods to a real-ish Chicago
// coordinate so agent tools have something geospatially plausible to work
// with until Justin's real geocoded listings replace this fixture.
const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  "Rogers Park": { lat: 42.0095, lng: -87.6673 },
  Edgewater: { lat: 41.9853, lng: -87.6685 },
  "Albany Park": { lat: 41.9686, lng: -87.7128 },
  Uptown: { lat: 41.9666, lng: -87.6555 },
  Avondale: { lat: 41.9386, lng: -87.7115 },
  "Logan Square": { lat: 41.9294, lng: -87.7073 },
  Lakeview: { lat: 41.9403, lng: -87.6438 },
  "Humboldt Park": { lat: 41.9042, lng: -87.7217 },
  "West Town": { lat: 41.8955, lng: -87.682 },
  "Near West Side": { lat: 41.8863, lng: -87.6553 },
  "The Loop": { lat: 41.8786, lng: -87.6298 },
  Bronzeville: { lat: 41.8272, lng: -87.6198 },
  "Little Village": { lat: 41.8443, lng: -87.7062 },
  Englewood: { lat: 41.7791, lng: -87.6448 },
  "Hyde Park": { lat: 41.7943, lng: -87.5907 },
  "South Shore": { lat: 41.7645, lng: -87.5751 },
}

export const FIXTURE_LISTINGS: Listing[] = homes.map((home) => {
  const coords = NEIGHBORHOOD_COORDS[home.neighborhood]
  if (!coords) {
    throw new Error(
      `Missing fixture coordinates for neighborhood: ${home.neighborhood}`
    )
  }
  return listingSchema.parse({
    id: home.id,
    address: home.address,
    lat: coords.lat,
    lng: coords.lng,
    price: home.rent,
    bedrooms: home.beds,
    bathrooms: 1,
    neighborhood: home.neighborhood,
  })
})

export const FIXTURE_AMENITIES: Amenity[] = [
  amenitySchema.parse({
    id: "loop-grocery",
    type: "grocery",
    name: "Loop Fresh Market",
    lat: 41.8802,
    lng: -87.6314,
  }),
  amenitySchema.parse({
    id: "loop-school",
    type: "school",
    name: "Ogden International School",
    lat: 41.8845,
    lng: -87.6389,
  }),
  amenitySchema.parse({
    id: "hyde-park-grocery",
    type: "grocery",
    name: "53rd Street Market",
    lat: 41.7996,
    lng: -87.5934,
  }),
  amenitySchema.parse({
    id: "hyde-park-school",
    type: "school",
    name: "Kenwood Academy",
    lat: 41.8047,
    lng: -87.5924,
  }),
  amenitySchema.parse({
    id: "logan-square-park",
    type: "park",
    name: "Logan Square Park",
    lat: 41.9294,
    lng: -87.7076,
  }),
  amenitySchema.parse({
    id: "logan-square-grocery",
    type: "grocery",
    name: "Milwaukee Ave Grocer",
    lat: 41.9298,
    lng: -87.7069,
  }),
  amenitySchema.parse({
    id: "humboldt-park",
    type: "park",
    name: "Humboldt Park",
    lat: 41.9034,
    lng: -87.7018,
  }),
  amenitySchema.parse({
    id: "avondale-school",
    type: "school",
    name: "Avondale-Logandale Elementary",
    lat: 41.9398,
    lng: -87.7123,
  }),
  amenitySchema.parse({
    id: "bronzeville-grocery",
    type: "grocery",
    name: "King Drive Grocer",
    lat: 41.8268,
    lng: -87.6172,
  }),
  amenitySchema.parse({
    id: "little-village-park",
    type: "park",
    name: "Piotrowski Park",
    lat: 41.8393,
    lng: -87.7157,
  }),
]

// Placeholder Chicago-area AMI figures. NOT verified against a current HUD
// publication — docs/superpowers/specs/2026-08-07-agent-design.md flags
// getting the real numbers as a dependency on Lydia. The household-size
// scaling factors themselves are HUD's standard methodology and are not
// the placeholder part; only BASE_100_PCT_AMI_FOR_FOUR is a guess.
const BASE_100_PCT_AMI_FOR_FOUR = 103_000
const HOUSEHOLD_SIZE_FACTOR: Record<number, number> = {
  1: 0.7,
  2: 0.8,
  3: 0.9,
  4: 1.0,
  5: 1.08,
  6: 1.16,
  7: 1.24,
  8: 1.32,
}

export function amiLimitForHouseholdSize(householdSize: number): number {
  const size = Math.min(Math.max(Math.round(householdSize), 1), 8)
  return Math.round(BASE_100_PCT_AMI_FOR_FOUR * HOUSEHOLD_SIZE_FACTOR[size])
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/agent/fixtures.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/fixtures.ts src/lib/agent/fixtures.test.ts
git commit -m "feat(agent): add stub listings, amenities, and AMI fixtures"
```

---

### Task 4: Tool definitions

**Files:**
- Create: `src/lib/agent/tools.ts`
- Test: `src/lib/agent/tools.test.ts`

**Interfaces:**
- Consumes: `haversineMiles`, `estimateDurationMinutes` (Task 2); `FIXTURE_LISTINGS`, `FIXTURE_AMENITIES`, `amiLimitForHouseholdSize` (Task 3); `showMapInputSchema` (Task 1).
- Produces: `agentTools` object with keys `geocodeWorkAddress`, `computeCommute`, `searchListings`, `nearbyAmenities`, `assessEligibility`, `show_map` — used by Task 6's API route.

- [ ] **Step 1: Write the failing test**

Create `src/lib/agent/tools.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { agentTools } from "./tools"

// The AI SDK's `tool()` execute signature takes (input, callOptions). The
// tests here only exercise business logic, so callOptions is stubbed.
const CALL_OPTIONS = { toolCallId: "test-call", messages: [] } as any

describe("agent tools", () => {
  it("computeCommute estimates a longer commute for walking than driving", async () => {
    const origin = { lat: 41.8825, lng: -87.6339 }
    const destination = { lat: 41.7943, lng: -87.5907 }
    const walk = await agentTools.computeCommute.execute!(
      { origin, destination, mode: "walk" },
      CALL_OPTIONS
    )
    const car = await agentTools.computeCommute.execute!(
      { origin, destination, mode: "car" },
      CALL_OPTIONS
    )
    expect(walk.durationMinutes).toBeGreaterThan(car.durationMinutes)
  })

  it("searchListings filters by budget", async () => {
    const results = await agentTools.searchListings.execute!(
      { budgetMax: 950 },
      CALL_OPTIONS
    )
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((listing) => listing.price <= 950)).toBe(true)
  })

  it("nearbyAmenities only returns amenities within the radius", async () => {
    const near = await agentTools.nearbyAmenities.execute!(
      { lat: 41.8825, lng: -87.6339, radiusMiles: 1 },
      CALL_OPTIONS
    )
    const far = await agentTools.nearbyAmenities.execute!(
      { lat: 41.8825, lng: -87.6339, radiusMiles: 0.01 },
      CALL_OPTIONS
    )
    expect(far.length).toBeLessThan(near.length)
  })

  it("assessEligibility classifies a low-income household as extremely-low", async () => {
    const result = await agentTools.assessEligibility.execute!(
      { annualHouseholdIncome: 20000, householdSize: 4 },
      CALL_OPTIONS
    )
    expect(result.amiTier).toBe("extremely-low")
  })

  it("assessEligibility classifies a high-income household as above-low-income", async () => {
    const result = await agentTools.assessEligibility.execute!(
      { annualHouseholdIncome: 250000, householdSize: 4 },
      CALL_OPTIONS
    )
    expect(result.amiTier).toBe("above-low-income")
    expect(result.eligiblePrograms).toEqual([])
  })

  it("show_map echoes back the payload it's given", async () => {
    const payload = {
      filters: {
        workAddress: "200 W Madison St, Chicago, IL",
        maxCommuteMinutes: 35,
        travelMode: "walk" as const,
        optimizeFor: "time" as const,
        householdSize: 1,
        numKids: 0,
        kidsAges: [],
      },
      rankedListings: [],
    }
    const result = await agentTools.show_map.execute!(payload, CALL_OPTIONS)
    expect(result.rankedListings).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/agent/tools.test.ts`
Expected: FAIL — `./tools` cannot be found.

- [ ] **Step 3: Implement the tools**

Create `src/lib/agent/tools.ts`:

```ts
import { tool } from "ai"
import { z } from "zod"

import {
  amiLimitForHouseholdSize,
  FIXTURE_AMENITIES,
  FIXTURE_LISTINGS,
} from "@/lib/agent/fixtures"
import { estimateDurationMinutes, haversineMiles } from "@/lib/agent/geo"
import { showMapInputSchema, travelModeSchema } from "@/lib/agent/schemas"

// Stub: always resolves to downtown Chicago regardless of the address text.
// Replace with Wade's real geocoding once it exists — the tool boundary
// (address in, {lat,lng} out) is the contract other code depends on.
const DOWNTOWN_CHICAGO = { lat: 41.8825, lng: -87.6339 }

export const geocodeWorkAddress = tool({
  description:
    "Resolve a freeform work address into latitude/longitude. Currently a stub that always returns a downtown Chicago coordinate.",
  inputSchema: z.object({ address: z.string() }),
  execute: async ({ address }) => ({
    address,
    lat: DOWNTOWN_CHICAGO.lat,
    lng: DOWNTOWN_CHICAGO.lng,
  }),
})

export const computeCommute = tool({
  description:
    "Estimate commute distance (miles) and duration (minutes) between two points for a given travel mode.",
  inputSchema: z.object({
    origin: z.object({ lat: z.number(), lng: z.number() }),
    destination: z.object({ lat: z.number(), lng: z.number() }),
    mode: travelModeSchema,
  }),
  execute: async ({ origin, destination, mode }) => {
    const distanceMiles =
      Math.round(haversineMiles(origin, destination) * 10) / 10
    return {
      distanceMiles,
      durationMinutes: estimateDurationMinutes(distanceMiles, mode),
      mode,
    }
  },
})

export const searchListings = tool({
  description:
    "Search Chicago affordable housing listings by budget and bedroom count. Currently backed by fixture data, not Justin's real dataset.",
  inputSchema: z.object({
    budgetMax: z.number().optional(),
    minBedrooms: z.number().optional(),
  }),
  execute: async ({ budgetMax, minBedrooms }) =>
    FIXTURE_LISTINGS.filter(
      (listing) =>
        (budgetMax === undefined || listing.price <= budgetMax) &&
        (minBedrooms === undefined || listing.bedrooms >= minBedrooms)
    ),
})

export const nearbyAmenities = tool({
  description:
    "Find parks, schools, and grocery stores within a radius (miles) of a point. Currently backed by fixture data, not Justin's real Chicago Data Portal layers.",
  inputSchema: z.object({
    lat: z.number(),
    lng: z.number(),
    radiusMiles: z.number(),
    types: z.array(z.enum(["park", "school", "grocery"])).optional(),
  }),
  execute: async ({ lat, lng, radiusMiles, types }) =>
    FIXTURE_AMENITIES.filter(
      (amenity) =>
        (!types || types.includes(amenity.type)) &&
        haversineMiles({ lat, lng }, amenity) <= radiusMiles
    ),
})

export const assessEligibility = tool({
  description:
    "Estimate a Chicago-area AMI (Area Median Income) tier from self-reported annual household income and household size. This is an informal estimate, not an official eligibility determination.",
  inputSchema: z.object({
    annualHouseholdIncome: z.number(),
    householdSize: z.number(),
  }),
  execute: async ({ annualHouseholdIncome, householdSize }) => {
    const ami = amiLimitForHouseholdSize(householdSize)
    const pctOfAmi = annualHouseholdIncome / ami

    if (pctOfAmi <= 0.3) {
      return {
        amiTier: "extremely-low" as const,
        eligiblePrograms: [
          "Public Housing",
          "Housing Choice Voucher (Section 8)",
        ],
      }
    }
    if (pctOfAmi <= 0.5) {
      return {
        amiTier: "very-low" as const,
        eligiblePrograms: [
          "Housing Choice Voucher (Section 8)",
          "Low-Income Housing Tax Credit (LIHTC) units",
        ],
      }
    }
    if (pctOfAmi <= 0.8) {
      return {
        amiTier: "low" as const,
        eligiblePrograms: ["Low-Income Housing Tax Credit (LIHTC) units"],
      }
    }
    return { amiTier: "above-low-income" as const, eligiblePrograms: [] }
  },
})

export const showMap = tool({
  description:
    "Present the final ranked housing results to the user. Call this once, after you've gathered enough information and reasoned about the tradeoffs yourself — there is no separate scoring step.",
  inputSchema: showMapInputSchema,
  execute: async (payload) => payload,
})

export const agentTools = {
  geocodeWorkAddress,
  computeCommute,
  searchListings,
  nearbyAmenities,
  assessEligibility,
  show_map: showMap,
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/agent/tools.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/tools.ts src/lib/agent/tools.test.ts
git commit -m "feat(agent): add tool definitions for commute, listings, amenities, and eligibility"
```

---

### Task 5: System prompt

**Files:**
- Create: `src/lib/agent/system-prompt.ts`
- Test: `src/lib/agent/system-prompt.test.ts`

**Interfaces:**
- Produces: `AGENT_SYSTEM_PROMPT: string` — used by Task 6's API route.

- [ ] **Step 1: Write the failing test**

Create `src/lib/agent/system-prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { AGENT_SYSTEM_PROMPT } from "./system-prompt"

describe("agent system prompt", () => {
  it("always requires the Chicago Housing Authority disclaimer", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain("Chicago Housing Authority")
    expect(AGENT_SYSTEM_PROMPT).toContain("self-reported estimate")
  })

  it("instructs the model to never gate map results on eligibility", () => {
    expect(AGENT_SYSTEM_PROMPT).toContain(
      "Never withhold or filter map results"
    )
  })

  it("references every available tool by name", () => {
    for (const toolName of [
      "geocodeWorkAddress",
      "searchListings",
      "computeCommute",
      "nearbyAmenities",
      "assessEligibility",
      "show_map",
    ]) {
      expect(AGENT_SYSTEM_PROMPT).toContain(toolName)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/agent/system-prompt.test.ts`
Expected: FAIL — `./system-prompt` cannot be found.

- [ ] **Step 3: Write the prompt**

Create `src/lib/agent/system-prompt.ts`:

```ts
export const AGENT_SYSTEM_PROMPT = `You are a housing search assistant for people looking for affordable housing in Chicago.

You have tools to look up housing listings (searchListings), estimate commute time and distance (computeCommute), find nearby parks/schools/grocery stores (nearbyAmenities), geocode a work address (geocodeWorkAddress), and estimate an Area Median Income eligibility tier (assessEligibility). Use them instead of guessing at facts.

Conversation behavior:
- If the user's message is missing information you need (work address, travel mode, or household size), ask a short, specific follow-up question in plain text before calling any tools. Don't ask more than two questions before making progress.
- Once you have enough to search, call geocodeWorkAddress, then searchListings, computeCommute, and nearbyAmenities as needed.
- You decide the ranking yourself by weighing commute time, cost, and nearby amenities against what the household asked for — there is no formula computing this for you. Explain that reasoning in each listing's "rationale".
- If a household has kids, prioritize amenities relevant to their ages (e.g. nearby schools) in your rationale.
- Call show_map exactly once, when you have a final ranked set of listings to present.

Eligibility and onboarding:
- If the conversation opens with something like "see if I qualify", lead with eligibility questions: annual household income, household size, and whether they receive SNAP, Medicaid, or Medicare. These are optional — the user can decline any of them.
- If you have income and household size, call assessEligibility and tell the user their likely AMI tier and matching program types in plain language.
- Always state clearly that this is a self-reported estimate, not an official determination, and that the real decision is made by the Chicago Housing Authority — point them to apply there.
- Never withhold or filter map results based on the eligibility estimate. Show housing options regardless of what tier the user falls into or whether they answered at all.
- Do not ask for or store more personal information than income, household size, benefits enrollment, and citizenship status — and only use it for the eligibility estimate and rent-to-income comparison, never for anything else.

Rent-to-income:
- If you know annual household income, compute each listing's rent-to-income ratio yourself (monthly rent × 12 ÷ annual income) and mention it in the rationale when it's notably high or low. Leave it out of the listing if income wasn't provided.`
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/agent/system-prompt.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/system-prompt.ts src/lib/agent/system-prompt.test.ts
git commit -m "feat(agent): add system prompt encoding conversation and eligibility rules"
```

---

### Task 6: API route

**Files:**
- Create: `src/routes/api/chat.ts`

**Interfaces:**
- Consumes: `agentTools` (Task 4), `AGENT_SYSTEM_PROMPT` (Task 5).
- Produces: `POST /api/chat` endpoint streaming a `UIMessage` stream — consumed by Task 7's `useChat()`.

This task has no automated test: it requires a live Anthropic API call. Verify it manually with curl.

- [ ] **Step 1: Implement the route**

Create `src/routes/api/chat.ts`:

```ts
import { anthropic } from "@ai-sdk/anthropic"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"
import { createFileRoute } from "@tanstack/react-router"

import { agentTools } from "@/lib/agent/tools"
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt"

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages }: { messages: UIMessage[] } = await request.json()

        const result = streamText({
          model: anthropic("claude-sonnet-5"),
          system: AGENT_SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          tools: agentTools,
          stopWhen: isStepCount(8),
        })

        return createUIMessageStreamResponse({
          stream: toUIMessageStream({ stream: result.stream }),
        })
      },
    },
  },
})
```

- [ ] **Step 2: Verify the route manually**

Make sure `.env` has a real `ANTHROPIC_API_KEY` (from Delores), then:

Run: `pnpm dev`

In another terminal:

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"I work at 200 W Madison St and want a 1 bedroom under 1200 dollars within 30 minutes by train."}]}]}'
```

Expected: a stream of `data:` chunks. Since the message already has address, budget, mode, and commute limit, the model should call `geocodeWorkAddress`, `searchListings`, `computeCommute`, and `nearbyAmenities`, then a `show_map` chunk with `rankedListings`. If it asks a clarifying question instead (e.g. about household size), that's also correct behavior per the system prompt — send a follow-up message with that info to see it through to `show_map`.

- [ ] **Step 3: Run the full test suite and typecheck to confirm nothing else broke**

Run: `pnpm vitest run && pnpm typecheck`
Expected: all tests PASS, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/chat.ts
git commit -m "feat(agent): add /api/chat route running the tool-calling agent"
```

---

### Task 7: Wire the chat panel into `HousingExplorer`

**Files:**
- Modify: `src/components/housing-explorer.tsx`

**Interfaces:**
- Consumes: `useChat` from `@ai-sdk/react` (calls `POST /api/chat` from Task 6 by default).

The current `agent-panel` (lines ~449-523) is a static, disabled preview: a "Not connected" notice, one hardcoded chat bubble, a static example blockquote, and a disabled textarea/button. This step replaces it with a live chat backed by `useChat`.

- [ ] **Step 1: Add the `useChat` import and hook**

In `src/components/housing-explorer.tsx`, add to the imports:

```tsx
import { useChat } from "@ai-sdk/react"
```

Remove `MessageSquareText` from the existing `lucide-react` import — it's only used in the static notice this task deletes, and `noUnusedLocals` in `tsconfig.json` will fail the build if it's left in.

Inside `export function HousingExplorer()`, alongside the other `useState` calls, add:

```tsx
const { messages, sendMessage, status } = useChat()
const [chatInput, setChatInput] = useState("")
```

- [ ] **Step 2: Replace the static agent panel**

Replace the entire block from `<div className="agent-notice" role="status">` through the closing `</div>` of `chat-composer` (the static notice, the hardcoded chat bubble, the "Example request" section, and the disabled composer) with:

```tsx
          <div className="chat-thread">
            {messages.length === 0 && (
              <div className="chat-message agent-message">
                <span className="message-avatar" aria-hidden="true">
                  <Bot />
                </span>
                <p>
                  Tell me about your commute, budget, and household — or ask
                  "see if I qualify" to check affordable housing eligibility.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "chat-message",
                  message.role === "user" ? "user-message" : "agent-message"
                )}
              >
                {message.role === "assistant" && (
                  <span className="message-avatar" aria-hidden="true">
                    <Bot />
                  </span>
                )}
                <div>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return <p key={`${message.id}-${index}`}>{part.text}</p>
                    }
                    if (
                      part.type === "tool-show_map" &&
                      part.state === "output-available"
                    ) {
                      const payload = part.output as {
                        rankedListings: Array<{
                          listing: {
                            id: string
                            address: string
                            neighborhood: string
                            price: number
                          }
                          commute: { durationMinutes: number; mode: string }
                          rationale: string
                        }>
                      }
                      return (
                        <div
                          key={`${message.id}-${index}`}
                          className="agent-show-map"
                        >
                          {payload.rankedListings.map((ranked) => (
                            <Card key={ranked.listing.id} className="result-card">
                              <CardContent className="result-content">
                                <strong>{ranked.listing.neighborhood}</strong>
                                <p>{ranked.listing.address}</p>
                                <p>
                                  ${ranked.listing.price}/mo ·{" "}
                                  {ranked.commute.durationMinutes} min by{" "}
                                  {ranked.commute.mode}
                                </p>
                                <p className="helper-copy">
                                  {ranked.rationale}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
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
            className="chat-composer"
            onSubmit={(event) => {
              event.preventDefault()
              if (!chatInput.trim()) return
              sendMessage({ text: chatInput })
              setChatInput("")
            }}
          >
            <Label htmlFor="agent-message" className="sr-only">
              Message the housing agent
            </Label>
            <Textarea
              id="agent-message"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder='Ask for a neighborhood, commute, or say "see if I qualify"…'
              rows={2}
              disabled={status === "streaming"}
            />
            <Button
              type="submit"
              disabled={status === "streaming" || !chatInput.trim()}
            >
              <Send /> Send
            </Button>
          </form>
```

Also remove the now-redundant `<Badge variant="outline" className="preview-badge">UI preview</Badge>` from the `agent-header`, and change the header subtitle `<p>Filter copilot</p>` to `<p>Ask about commute, budget, or eligibility</p>`.

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors. If `noUnusedLocals` complains, double check every icon still referenced (`Sparkles`, `SlidersHorizontal`, etc. are still used elsewhere in this file — only `MessageSquareText` should be removed).

- [ ] **Step 4: Manually verify in the browser**

Run: `pnpm dev`, open `http://localhost:3000`.

Golden path: type "I work at 200 W Madison St, want a 1 bedroom under $1200, within 30 minutes by train" and send. Confirm the assistant either asks a short clarifying question (e.g. household size) or responds with ranked listing cards. Send a follow-up answering any question and confirm it eventually produces listing cards with a rationale.

Edge case: type "see if I qualify" and confirm the assistant leads with income/household/benefits questions and, once answered, states the estimate is self-reported and mentions the Chicago Housing Authority — and separately confirm it still offers to search for housing regardless of the eligibility answer.

- [ ] **Step 5: Commit**

```bash
git add src/components/housing-explorer.tsx
git commit -m "feat(agent): wire live chat into the housing explorer agent panel"
```
