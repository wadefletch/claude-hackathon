/**
 * Domain model for the Chicago low-income housing finder.
 *
 * `UserProfile` is the JSON source of truth (left config panel + agent contract).
 * External feeds normalize into `HousingDevelopment`, `Amenity`, `School`,
 * `TransitStop`; `Route` is computed. `HousingMatch` is the composite the agent
 * and UI consume. `geojson.ts` transforms any of it for Mapcn rendering.
 */
export * from "./enums"
export * from "./location"
export * from "./profile"
export * from "./housing"
export * from "./detail"
export * from "./amenity"
export * from "./route"
export * from "./match"
export * from "./neighborhood"
export * from "./search"
export * from "./geojson"
export * from "./appmap"
export * from "./agent"
