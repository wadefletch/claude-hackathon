import { z } from "zod"

/**
 * A normalized affordable housing development. The external inventory the map
 * renders as pins; filtered down to a candidate set per profile (logic is out
 * of scope here).
 */
export const HousingDevelopment = z.object({
  id: z.string(), // derived slug (the source dataset has no stable id)
  propertyName: z.string(),
  address: z.string(),
  zip: z.string().optional(),
  communityArea: z.string().optional(),
  communityAreaNumber: z.number().optional(),
  propertyType: z.string().optional(), // Multifamily | ARO | Senior | Supportive | ...
  units: z.number().optional(),
  phone: z.string().optional(),
  managementCompany: z.string().optional(),
  location: z.object({ lat: z.number(), lng: z.number() }),
})
export type HousingDevelopment = z.infer<typeof HousingDevelopment>

/**
 * Raw row shape from the Chicago Open Data SODA endpoint
 * `https://data.cityofchicago.org/resource/s6ha-ppgi.json`. Every value arrives
 * as a string; coords/units are coerced during parsing. All fields optional to
 * survive the occasional incomplete record.
 */
export const SocrataHousingRow = z.object({
  community_area: z.string().optional(),
  community_area_number: z.string().optional(),
  property_type: z.string().optional(),
  property_name: z.string().optional(),
  address: z.string().optional(),
  zip_code: z.string().optional(),
  phone_number: z.string().optional(),
  management_company: z.string().optional(),
  units: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
})
export type SocrataHousingRow = z.infer<typeof SocrataHousingRow>

/** Lowercase-kebab slug used to derive a stable id from name + address. */
function slug(...parts: Array<string | undefined>): string {
  return parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

const toNumber = (v: string | undefined): number | undefined => {
  if (v === undefined || v.trim() === "") return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

/**
 * Map a raw Socrata row to a normalized {@link HousingDevelopment}. Returns null
 * for rows missing the essentials (name, address, or coordinates) so callers can
 * filter them out. Does not throw — validate the result with
 * `HousingDevelopment.parse` if you need a hard guarantee.
 */
export function parseSocrataHousing(raw: unknown): HousingDevelopment | null {
  const row = SocrataHousingRow.safeParse(raw)
  if (!row.success) return null
  const r = row.data

  const lat = toNumber(r.latitude)
  const lng = toNumber(r.longitude)
  if (
    !r.property_name ||
    !r.address ||
    lat === undefined ||
    lng === undefined
  ) {
    return null
  }

  return {
    id: slug(r.property_name, r.address),
    propertyName: r.property_name,
    address: r.address,
    zip: r.zip_code,
    communityArea: r.community_area,
    communityAreaNumber: toNumber(r.community_area_number),
    propertyType: r.property_type,
    units: toNumber(r.units),
    phone: r.phone_number,
    managementCompany: r.management_company,
    location: { lat, lng },
  }
}

/** SODA endpoint for the Affordable Rental Housing Developments dataset. */
export const HOUSING_SODA_URL =
  "https://data.cityofchicago.org/resource/s6ha-ppgi.json"
