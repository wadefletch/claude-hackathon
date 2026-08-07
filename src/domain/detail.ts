import { z } from "zod"

/**
 * Where a review came from. Mirrors the platforms in the UI's
 * `lib/building-reviews.ts` so its mock data maps onto this entity directly.
 */
export const ReviewPlatform = z.enum([
  "Google Reviews",
  "Apartments.com",
  "Zillow",
])
export type ReviewPlatform = z.infer<typeof ReviewPlatform>

/**
 * A single apartment review. No Chicago feed provides these, so they're mocked
 * for the demo — `isMock` records provenance for when a real feed is wired in.
 * Field names align with the UI's `BuildingReview` (`text`, `tags`, `recency`).
 */
export const Review = z.object({
  id: z.string(),
  platform: ReviewPlatform,
  rating: z.number().min(1).max(5),
  author: z.string().optional(),
  date: z.string().optional(), // ISO date
  recency: z.string().optional(), // human label, e.g. "3 weeks ago"
  text: z.string(),
  tags: z.array(z.string()).optional(),
  isMock: z.boolean().default(true),
})
export type Review = z.infer<typeof Review>

/** Per-platform rollup shown above the review list (matches the UI). */
export const ReviewSourceSummary = z.object({
  platform: ReviewPlatform,
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
})
export type ReviewSourceSummary = z.infer<typeof ReviewSourceSummary>

/**
 * Rich detail shown in the popup card when a housing pin is clicked. Lazily
 * loaded (not part of the map inventory). Mocked for the demo where the Chicago
 * datasets stop: rent/beds (the s6ha-ppgi feed has neither), amenities, reviews.
 * `rentUsd`/`beds` are single-value bridges to the UI's `Home` shape; the range
 * fields carry richer info when available.
 */
export const HousingDetail = z.object({
  housingId: z.string(),
  rentUsd: z.number().positive().optional(),
  beds: z.number().int().nonnegative().optional(),
  rentRangeUsd: z.tuple([z.number(), z.number()]).optional(),
  bedroomTypes: z.array(z.string()).optional(), // e.g. ["Studio", "1BR", "2BR"]
  buildingAmenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  averageRating: z.number().min(0).max(5).optional(),
  totalReviewCount: z.number().int().nonnegative().optional(),
  sourceSummaries: z.array(ReviewSourceSummary).optional(),
  reviews: z.array(Review).optional(),
  isMock: z.boolean().default(true),
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
const MOCK_PLATFORMS: ReviewPlatform[] = [
  "Google Reviews",
  "Apartments.com",
  "Zillow",
]
const MOCK_REVIEW_TEXTS = [
  "Management is responsive and the neighborhood is quiet.",
  "Great access to transit, a bit noisy on weekends.",
  "Clean building, maintenance requests handled quickly.",
  "Affordable for the area and close to a grocery store.",
]
const MOCK_TAGS = ["Responsive staff", "Transit", "Clean", "Value", "Quiet"]

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
    platform: MOCK_PLATFORMS[(h + i) % MOCK_PLATFORMS.length],
    rating: 3 + ((h + i) % 3),
    author: `Resident ${((h + i) % 9) + 1}`,
    recency: ["3 weeks ago", "2 months ago", "6 months ago"][i % 3],
    text: MOCK_REVIEW_TEXTS[(h + i) % MOCK_REVIEW_TEXTS.length],
    tags: [MOCK_TAGS[(h + i) % MOCK_TAGS.length]],
    isMock: true,
  }))
  const averageRating =
    Math.round(
      (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
    ) / 10

  const sourceSummaries: ReviewSourceSummary[] = MOCK_PLATFORMS.map(
    (platform, i) => ({
      platform,
      rating: averageRating,
      reviewCount: 18 + ((h + i * 17) % 79),
    })
  )

  return {
    housingId,
    rentUsd: baseRent,
    beds: bedCount,
    rentRangeUsd: [baseRent, baseRent + 400],
    bedroomTypes: MOCK_BEDROOMS.slice(0, bedCount + 1),
    buildingAmenities: MOCK_AMENITIES.slice(0, 3 + (h % 3)),
    averageRating,
    totalReviewCount: sourceSummaries.reduce((s, x) => s + x.reviewCount, 0),
    sourceSummaries,
    reviews,
    isMock: true,
  }
}
