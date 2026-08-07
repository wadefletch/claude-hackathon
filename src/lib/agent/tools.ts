import { tool } from "ai"
import { z } from "zod"

import {
  AmenityCategory,
  HOUSING_SODA_URL,
  parseSocrataHousing,
  ProfilePatch,
  TransportMode,
} from "@/domain"
import { mockHousingDetail } from "@/domain/detail"
import type { HousingDevelopment } from "@/domain/housing"
import type { Route } from "@/domain/route"
import {
  amiLimitForHouseholdSize,
  FIXTURE_AMENITIES,
  FIXTURE_SCHOOLS,
  FIXTURE_TRANSIT_STOPS,
} from "@/lib/agent/fixtures"
import { estimateDurationMinutes, haversineMeters } from "@/lib/agent/geo"
import { showMapInputSchema } from "@/lib/agent/schemas"

function soqlList(values: string[]): string {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(",")
}

export const searchHousingDevelopments = tool({
  description:
    "Search Chicago's real affordable rental housing developments (Chicago Open Data, resource s6ha-ppgi) by community area and/or property type. This feed has no rent or bedroom data — call getHousingDetail for that. Keep limit small (default 15): you'll be evaluating each result in detail with other tools, so a large limit means a slow, expensive turn — narrow with communityAreas/propertyTypes instead of raising it.",
  inputSchema: z.object({
    communityAreas: z.array(z.string()).optional(),
    propertyTypes: z.array(z.string()).optional(),
    limit: z.number().int().positive().max(50).default(15),
  }),
  execute: async ({ communityAreas, propertyTypes, limit }) => {
    const params = new URLSearchParams({ $limit: String(limit) })
    const clauses: string[] = []
    if (communityAreas?.length) {
      clauses.push(`community_area in(${soqlList(communityAreas)})`)
    }
    if (propertyTypes?.length) {
      clauses.push(`property_type in(${soqlList(propertyTypes)})`)
    }
    if (clauses.length) {
      params.set("$where", clauses.join(" AND "))
    }

    const response = await fetch(`${HOUSING_SODA_URL}?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`Chicago open data request failed: ${response.status}`)
    }
    const rows: unknown[] = await response.json()

    return rows
      .map(parseSocrataHousing)
      .filter((development): development is HousingDevelopment => development !== null)
  },
})

export const getHousingDetail = tool({
  description:
    "Get rent range, bedroom types, building amenities, and reviews for a housing development. This data is currently mocked — no real pricing/detail feed is wired up yet.",
  inputSchema: z.object({ housingId: z.string() }),
  execute: async ({ housingId }) => mockHousingDetail(housingId),
})

export const computeRoute = tool({
  description:
    "Estimate a Route (distance, duration) between a housing development and a destination (work, amenity, or school) for a travel mode. Currently a straight-line estimate (Route.estimate = true) — no real routing provider is wired up yet.",
  inputSchema: z.object({
    housingId: z.string(),
    origin: z.object({ lat: z.number(), lng: z.number() }),
    destination: z.object({ lat: z.number(), lng: z.number() }),
    purpose: z.enum(["work", "amenity", "school"]),
    destinationId: z.string(),
    destinationLabel: z.string().optional(),
    mode: TransportMode,
  }),
  execute: async ({
    housingId,
    origin,
    destination,
    purpose,
    destinationId,
    destinationLabel,
    mode,
  }) => {
    const distanceMeters = haversineMeters(origin, destination)
    const distanceMiles = distanceMeters / 1609.34

    const route: Route = {
      housingId,
      purpose,
      destinationId,
      destinationLabel,
      mode,
      durationMinutes: estimateDurationMinutes(distanceMiles, mode),
      distanceMeters: Math.round(distanceMeters),
      estimate: true,
    }
    return route
  },
})

export const nearbyPlaces = tool({
  description:
    "Find nearby amenities (groceries, parks, schools, etc.) and transit stops within a radius (meters) of a point. Currently backed by a small fixture set for a few Chicago neighborhoods, not a real feed.",
  inputSchema: z.object({
    lat: z.number(),
    lng: z.number(),
    radiusMeters: z.number(),
    categories: z.array(AmenityCategory).optional(),
  }),
  execute: async ({ lat, lng, radiusMeters, categories }) => {
    const origin = { lat, lng }

    const amenities = FIXTURE_AMENITIES.filter(
      (amenity) =>
        (!categories || categories.includes(amenity.category)) &&
        haversineMeters(origin, amenity.location) <= radiusMeters
    ).map((amenity) => ({
      ...amenity,
      distanceMeters: Math.round(haversineMeters(origin, amenity.location)),
    }))

    const schools = FIXTURE_SCHOOLS.filter(
      (school) => haversineMeters(origin, school.location) <= radiusMeters
    ).map((school) => ({
      ...school,
      distanceMeters: Math.round(haversineMeters(origin, school.location)),
    }))

    const transitStops = FIXTURE_TRANSIT_STOPS.filter(
      (stop) => haversineMeters(origin, stop.location) <= radiusMeters
    ).map((stop) => ({
      ...stop,
      walkMeters: Math.round(haversineMeters(origin, stop.location)),
    }))

    return { amenities, schools, transitStops }
  },
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

export const updateProfile = tool({
  description:
    "Apply a patch to the user's profile (household members, priorities, housing needs) based on what they've told you. Call this whenever you learn something that should update their settings, so the rest of the app stays in sync.",
  inputSchema: ProfilePatch,
  execute: async (patch) => patch,
})

export const showMap = tool({
  description:
    "Present the final ranked housing matches to the user, alongside their current profile. Call this once, after you've gathered enough information and reasoned about the tradeoffs yourself — there is no separate scoring step.",
  inputSchema: showMapInputSchema,
  execute: async (payload) => payload,
})

export const agentTools = {
  searchHousingDevelopments,
  getHousingDetail,
  computeRoute,
  nearbyPlaces,
  assessEligibility,
  update_profile: updateProfile,
  show_map: showMap,
}
