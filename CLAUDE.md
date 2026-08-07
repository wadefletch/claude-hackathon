# Project Context

This repository is a Claude Impact Lab hackathon project. We are building for Danielle Ochoa, the primary user defined in `PERSONA.md`. Treat that document as the source of truth for product priorities, user experience, content, and tradeoffs; read it before making product-facing decisions.

## Design System

Use the shadcn theme configured in `components.json` and `src/styles.css` as the product design system. Compose the existing components and design tokens without editing files in `src/components/ui/`. Apply Tailwind utility classes directly to components for all application styling. Do not create custom utility classes; the only non-Tailwind classes allowed are those provided by MapCN or shadcn.

## Maps

Build map experiences with MapCN. Use its components and APIs instead of integrating with MapLibre GL directly.

## Tests

`pnpm test` runs the tests in `src/lib/agent/`. Run it only when a change touches that directory; do not run tests for other changes.
