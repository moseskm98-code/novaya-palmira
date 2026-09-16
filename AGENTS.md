# Prototype Instructions

User rollback 2026-09-16: restore site content and design to commit 0889bd9, before the request about missing electricity/family information and removing visualization badges. Preserve GitHub Pages deployment support. Five original routes and visible visualization badges are restored.

User decision 2026-09-16: implement displayed concept 1 from ../design-research-2026-09-16/concept-01.png using Hono + Bun + React. This supersedes the template's Vite/Sites runtime conventions. Five primary routes only: home, management, developer, mansards, commercial. Each includes navigation and floorplans. Use original logos and bundled Montserrat/Arsenal fonts. Old briefs are content evidence only, not active design requirements. Do not claim real lead delivery without a configured receiver and confirmed response.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
