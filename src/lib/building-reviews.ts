import type { Home } from "./housing-data"

export type ReviewSource = "Google Reviews" | "Apartments.com" | "Zillow"

export interface ReviewSourceSummary {
  source: ReviewSource
  rating: number
  reviewCount: number
}

export interface BuildingReview {
  id: string
  source: ReviewSource
  rating: number
  author: string
  date: string
  recency: string
  text: string
  tags: string[]
  isMock: true
}

export interface BuildingReviewData {
  isMock: true
  averageRating: number
  totalReviewCount: number
  sources: ReviewSourceSummary[]
  reviews: BuildingReview[]
}

interface ReviewProfile {
  highlight: string
  secondHighlight: string
  caution: string
  tags: [string, string, string]
  rating: number
}

const profiles: Partial<Record<string, ReviewProfile>> = {
  "rogers-park": {
    highlight: "the quiet courtyard and easy access to the lakefront",
    secondHighlight: "the attentive on-site team",
    caution: "radiator heat can make upper floors warm in winter",
    tags: ["Quiet", "Lake access", "Responsive staff"],
    rating: 4.3,
  },
  edgewater: {
    highlight: "the short walk to the Red Line and nearby groceries",
    secondHighlight: "the bright apartments and tidy common areas",
    caution: "Broadway traffic is noticeable in street-facing homes",
    tags: ["Transit", "Walkable", "Clean"],
    rating: 4.1,
  },
  "albany-park": {
    highlight: "the generous layouts and useful storage",
    secondHighlight: "the friendly maintenance crew",
    caution: "laundry is busiest on weekend afternoons",
    tags: ["Spacious", "Maintenance", "Storage"],
    rating: 4.4,
  },
  uptown: {
    highlight: "the Wilson station access and neighborhood restaurants",
    secondHighlight: "the secure package room",
    caution: "the lobby gets busy around evening commute time",
    tags: ["Transit", "Packages", "Dining"],
    rating: 4.2,
  },
  avondale: {
    highlight: "the practical floor plans and Milwaukee Avenue buses",
    secondHighlight: "quick responses to routine work orders",
    caution: "some bedrooms have limited closet space",
    tags: ["Layout", "Bus access", "Maintenance"],
    rating: 4.0,
  },
  "logan-square": {
    highlight: "the tree-lined blocks and easy Blue Line connection",
    secondHighlight: "the calm courtyard-facing apartments",
    caution: "street parking fills quickly on Friday nights",
    tags: ["Blue Line", "Quiet", "Neighborhood"],
    rating: 4.5,
  },
  lakeview: {
    highlight: "the walkable location and nearby parks",
    secondHighlight: "well-kept hallways and shared spaces",
    caution: "Ashland buses can be heard from front bedrooms",
    tags: ["Walkable", "Parks", "Clean"],
    rating: 4.2,
  },
  "humboldt-park": {
    highlight: "the larger two-bedroom layouts and park access",
    secondHighlight: "neighbors who look out for one another",
    caution: "older windows can feel drafty during cold snaps",
    tags: ["Spacious", "Community", "Park access"],
    rating: 3.9,
  },
  "west-town": {
    highlight: "the quick trip downtown and excellent local cafés",
    secondHighlight: "the responsive leasing office",
    caution: "weekend nightlife creates occasional street noise",
    tags: ["Commute", "Responsive staff", "Dining"],
    rating: 4.3,
  },
  "near-west": {
    highlight: "the convenient buses and roomy bedrooms",
    secondHighlight: "reliable elevator and package handling",
    caution: "event traffic can slow the surrounding streets",
    tags: ["Transit", "Packages", "Spacious"],
    rating: 4.1,
  },
  loop: {
    highlight: "the exceptionally short commute and staffed front desk",
    secondHighlight: "the efficient studio layouts",
    caution: "downtown sirens are audible on lower floors",
    tags: ["Short commute", "Front desk", "Studio"],
    rating: 4.0,
  },
  bronzeville: {
    highlight: "the lakefront access and generous room sizes",
    secondHighlight: "the helpful maintenance technicians",
    caution: "some shared finishes show their age",
    tags: ["Lake access", "Spacious", "Maintenance"],
    rating: 4.2,
  },
  "little-village": {
    highlight: "the value, nearby shops, and family-friendly blocks",
    secondHighlight: "the sunny kitchens",
    caution: "visitor parking is limited after 7 p.m.",
    tags: ["Value", "Shopping", "Natural light"],
    rating: 3.8,
  },
  englewood: {
    highlight: "the affordable rent and spacious floor plans",
    secondHighlight: "recent improvements to the entry system",
    caution: "maintenance response times vary during busy weeks",
    tags: ["Value", "Spacious", "Secure entry"],
    rating: 3.7,
  },
  "hyde-park": {
    highlight: "the leafy streets and easy walk to neighborhood amenities",
    secondHighlight: "the vintage details and natural light",
    caution: "older floors transmit some upstairs footsteps",
    tags: ["Walkable", "Natural light", "Vintage"],
    rating: 4.4,
  },
  "south-shore": {
    highlight: "the lake views and generous two-bedroom layouts",
    secondHighlight: "the welcoming resident community",
    caution: "the downtown trip requires extra planning late at night",
    tags: ["Lake views", "Spacious", "Community"],
    rating: 4.0,
  },
}

const sources: ReviewSource[] = ["Google Reviews", "Apartments.com", "Zillow"]
const authors = [
  ["Maya R.", "Andre W.", "Priya S."],
  ["Elena C.", "Jordan T.", "Marcus L."],
  ["Nia B.", "Sam K.", "Tessa H."],
  ["Carmen D.", "Lee P.", "Owen J."],
] as const
const dates = [
  { date: "2026-07-18", recency: "3 weeks ago" },
  { date: "2026-05-26", recency: "2 months ago" },
  { date: "2026-02-11", recency: "6 months ago" },
] as const

function clampRating(rating: number) {
  return Math.max(1, Math.min(5, Number(rating.toFixed(1))))
}

export function getBuildingReviewData(
  home: Pick<Home, "id" | "name" | "neighborhood">
): BuildingReviewData {
  const profile = profiles[home.id]

  if (!profile) {
    throw new Error(`Missing mock review profile for ${home.id}`)
  }

  const profileIndex = Object.keys(profiles).indexOf(home.id)
  const ratingOffsets = [0.1, -0.2, 0] as const
  const sourceSummaries = sources.map((source, index) => ({
    source,
    rating: clampRating(profile.rating + ratingOffsets[index]),
    reviewCount: 18 + ((profileIndex * 13 + index * 17) % 79),
  }))
  const reviewerNames = authors[profileIndex % authors.length]
  const texts = [
    `I have enjoyed living at ${home.name}, especially ${profile.highlight}. ${profile.secondHighlight[0].toUpperCase()}${profile.secondHighlight.slice(1)} has made day-to-day life easier.`,
    `${home.name} has been a solid fit for ${home.neighborhood}. The best parts are ${profile.secondHighlight} and ${profile.highlight}; prospective residents should know that ${profile.caution}.`,
    `After settling in, ${profile.highlight} stands out most. The building feels like a good value for the area, though ${profile.caution}.`,
  ]

  const reviews = sources.map((source, index) => ({
    id: `${home.id}-${source.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    source,
    rating: clampRating(profile.rating + ratingOffsets[index]),
    author: reviewerNames[index],
    date: dates[index].date,
    recency: dates[index].recency,
    text: texts[index],
    tags:
      index === 1 ? [profile.tags[1], profile.tags[2]] : [profile.tags[index]],
    isMock: true as const,
  }))
  const totalReviewCount = sourceSummaries.reduce(
    (total, source) => total + source.reviewCount,
    0
  )
  const averageRating = Number(
    (
      sourceSummaries.reduce(
        (total, source) => total + source.rating * source.reviewCount,
        0
      ) / totalReviewCount
    ).toFixed(1)
  )

  return {
    isMock: true,
    averageRating,
    totalReviewCount,
    sources: sourceSummaries,
    reviews,
  }
}

export function hasReviewProfile(homeId: string) {
  return homeId in profiles
}
