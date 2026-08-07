# QualiFind

QualiFind is a web app that simplifies the search for subsidized housing in Chicago into a single, guided experience by matching users with their best housing fits for their needs.

## Problem

Chicago residents who qualify for subsidized housing have a hard time finding it. Section 8, CHA, and IHDA all have different eligibility rules, different websites, and different application processes. Figuring out what you actually qualify for based on income and household size takes real effort, and even after finding a unit, there's no easy way to tell if it's near your job, a decent school, or a park.

## Solution

- Enter household size and income to check eligibility for Section 8, CHA, and IHDA programs based on current AMI thresholds
- Browse listings ranked by proximity to work, schools (with quality ratings), grocery stores, parks, trails, beaches, etc.
- See reviews pulled from public sources to get a real sense of what living there is like
- Get routed directly to the right agency to apply

## Isochrone map

Copy `.env.example` to `.env`, add a free Geoapify API key, and restrict the key
to your local and production origins. `AppMap` accepts an optional `isochrone`
prop with `mode` (`drive` or `transit`) and `minutes`.

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
