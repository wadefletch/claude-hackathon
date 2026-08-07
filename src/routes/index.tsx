import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { HousingExplorer } from "@/components/housing-explorer"
import { UserProfile } from "@/domain"
import { rankedHousingMatchSchema } from "@/lib/agent/schemas"

// The agent-produced app/map state, persisted in the URL so it survives
// reloads/back-forward and so other components (Wade's map, Rob's UI) can
// read it without needing the chat's local state. Query-param updates
// re-render the page without a full reload.
export const appSearchSchema = z.object({
  profile: UserProfile.optional(),
  matches: z.array(rankedHousingMatchSchema).optional(),
})
export type AppSearch = z.infer<typeof appSearchSchema>

export const Route = createFileRoute("/")({
  validateSearch: (search) => appSearchSchema.parse(search),
  component: HousingExplorer,
})
