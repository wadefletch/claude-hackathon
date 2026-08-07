import { createFileRoute } from "@tanstack/react-router"

import { HousingExplorer } from "@/components/housing-explorer"

export const Route = createFileRoute("/")({ component: HousingExplorer })
