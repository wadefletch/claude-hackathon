# QualiFind

QualiFind is a web app that simplifies the search for subsidized housing in Chicago into a single, guided experience by matching users with their best housing fits for their needs.

Built for Claude Community.

## Problem

Chicago residents who qualify for subsidized housing have a hard time finding it. Section 8, CHA, and IHDA all have different eligibility rules, different websites, and different application processes. Even after finding a unit, there's no easy way to tell if it's near your job, a decent school, or a park.

## What it does

- Enter household size and income to check eligibility based on AMI thresholds
- Browse listings on a map, matched to priorities like work, schools, parks, and transit
- Click a listing to see details and reviews pulled from public sources
- Get pointed to the right agency (CHA / IHDA) to actually apply — QualiFind isn't an application portal, it's the step before one

## How it works

No database. A user's profile (household, income, priorities) is a JSON object validated with Zod, shared between the UI and an agent chat that can update it directly. Housing, school, and amenity data is fetched live from public APIs and normalized at runtime.

## Data sources

- [Chicago Open Data — Affordable Rental Housing Developments](https://data.cityofchicago.org/resource/s6ha-ppgi.json)
- Chicago Public Schools — School Locations
- Chicago Open Data + OpenStreetMap (amenities)
- CTA GTFS (transit stops)

## Tech stack

TanStack Start, React 19, Tailwind v4, shadcn/ui, Zod, MapLibre (via Mapcn), Claude, Vervcel


# TanStack Start + shadcn/ui

This is a template for a new TanStack Start project with React, TypeScript, and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```
