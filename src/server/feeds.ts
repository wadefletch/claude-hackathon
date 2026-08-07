import { createServerFn } from "@tanstack/react-start"
import { HOUSING_SODA_URL, parseSocrataHousing } from "@/domain"
import type { HousingDevelopment } from "@/domain"

export interface HousingFeedResult {
  sourceUrl: string
  fetchedAt: string
  rawCount: number
  parsedCount: number
  droppedCount: number
  developments: HousingDevelopment[]
}

/**
 * Server function: fetch the live Chicago Affordable Rental Housing feed, run it
 * through `parseSocrataHousing`, and report raw vs. parsed vs. dropped counts so
 * the diagnostics page can prove the fetch + transformation pipeline works.
 * Runs server-side (avoids CORS, keeps the raw payload off the client).
 */
export const fetchHousingFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<HousingFeedResult> => {
    const url = `${HOUSING_SODA_URL}?$limit=1000`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`SODA request failed: ${res.status} ${res.statusText}`)
    }
    const rows = (await res.json()) as unknown[]
    const parsed = rows
      .map(parseSocrataHousing)
      .filter((d): d is HousingDevelopment => d !== null)

    // The feed has repeat name+address rows (multiple unit types) that produce
    // colliding derived ids. Keep one entry per id so ids stay unique.
    const byId = new Map<string, HousingDevelopment>()
    for (const development of parsed) {
      if (!byId.has(development.id)) byId.set(development.id, development)
    }
    const developments = [...byId.values()]

    return {
      sourceUrl: url,
      fetchedAt: new Date().toISOString(),
      rawCount: rows.length,
      parsedCount: developments.length,
      droppedCount: rows.length - developments.length,
      developments,
    }
  }
)
