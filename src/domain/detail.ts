import { z } from "zod"

/**
 * A single apartment review. No Chicago feed provides these, so they're mocked
 * for the demo — `source` records provenance for when a real feed is wired in.
 */
export const Review = z.object({
  id: z.string(),
  rating: z.number().min(1).max(5),
  author: z.string().optional(),
  date: z.string().optional(), // ISO date
  body: z.string(),
  source: z.enum(["mock", "external"]).default("mock"),
})
export type Review = z.infer<typeof Review>

/**
 * Rich detail shown in the popup card when a housing pin is clicked. Lazily
 * loaded (not part of the map inventory). Mocked for the demo where the Chicago
 * datasets stop (rent, bedrooms, amenities, reviews).
 */
export const HousingDetail = z.object({
  housingId: z.string(),
  rentRangeUsd: z.tuple([z.number(), z.number()]).optional(),
  bedroomTypes: z.array(z.string()).optional(), // e.g. ["Studio", "1BR", "2BR"]
  buildingAmenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  rating: z.number().min(0).max(5).optional(), // average
  reviews: z.array(Review).optional(),
  source: z.enum(["mock", "external"]).default("mock"),
})
export type HousingDetail = z.infer<typeof HousingDetail>

const MOCK_AMENITIES = [
  "In-unit laundry",
  "Elevator",
  "On-site management",
  "Community room",
  "Bike storage",
  "Wheelchair accessible",
]
const MOCK_BEDROOMS = ["Studio", "1BR", "2BR", "3BR"]
const MOCK_REVIEW_BODIES = [
  "Management is responsive and the neighborhood is quiet.",
  "Great access to transit, a bit noisy on weekends.",
  "Clean building, maintenance requests handled quickly.",
  "Affordable for the area and close to a grocery store.",
]

/**
 * Deterministic mock detail for a housing id — same id always yields the same
 * card, so the demo is stable across reloads. Swap for a real fetch later.
 */
export function mockHousingDetail(housingId: string): HousingDetail {
  // Simple stable hash of the id to vary the mock without randomness.
  let h = 0
  for (const ch of housingId) h = (h * 31 + ch.charCodeAt(0)) >>> 0

  const bedCount = 1 + (h % 3)
  const reviewCount = 2 + (h % 3)
  const baseRent = 800 + (h % 12) * 75

  const reviews: Review[] = Array.from({ length: reviewCount }, (_, i) => ({
    id: `${housingId}-review-${i}`,
    rating: 3 + ((h + i) % 3),
    author: `Resident ${((h + i) % 9) + 1}`,
    body: MOCK_REVIEW_BODIES[(h + i) % MOCK_REVIEW_BODIES.length],
    source: "mock" as const,
  }))
  const rating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

  return {
    housingId,
    rentRangeUsd: [baseRent, baseRent + 400],
    bedroomTypes: MOCK_BEDROOMS.slice(0, bedCount + 1),
    buildingAmenities: MOCK_AMENITIES.slice(0, 3 + (h % 3)),
    rating: Math.round(rating * 10) / 10,
    reviews,
    source: "mock",
  }
}
