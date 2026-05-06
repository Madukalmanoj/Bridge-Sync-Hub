# BridgeSync

AI-driven government interoperability platform for Karnataka's Single Window Portal — enables citizens to submit one application that automatically routes to all required departments, with officers reviewing and approving in real time.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/bridgesync run dev` — run the frontend (port 21753, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `GEMINI_API_KEY` — enables real Gemini AI (falls back to mock if absent)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, Wouter (routing), TanStack Query, Tailwind CSS, shadcn/ui, Zustand, Recharts
- API: Express 5 (port 8080, base path `/api`)
- DB: PostgreSQL + Drizzle ORM
- AI: Google Gemini 1.5 Flash (via `@google/generative-ai`) with mock fallbacks
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

```
artifacts/
  api-server/src/
    app.ts                  — Express app setup, mounts router at /api
    routes/                 — health, applications, departments, analytics, ai
    lib/aiService.ts        — Gemini integration + mock fallbacks
  bridgesync/src/
    App.tsx                 — Router (wouter), QueryClient, dark mode
    pages/
      citizen/CitizenPortal.tsx   — Application form + tracker + AI chatbot
      officer/OfficerDashboard.tsx — Officer login + queue + approve/reject
      admin/AdminDashboard.tsx     — SLA monitor, schema mapper, event bus
      admin/tabs/                 — SchemaMapperTab, OnboardingTab, WorkflowTab
    store/useDemoStore.ts   — Zustand: demo mode, language (EN/KN)
    components/layout/Navbar.tsx
lib/
  api-spec/openapi.yaml     — OpenAPI spec (source of truth for all API contracts)
  api-client-react/         — Generated TanStack Query hooks
  api-zod/src/index.ts      — Generated Zod schemas (ONLY exports ./generated/api)
  db/src/schema/            — Drizzle table definitions
```

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval generates hooks + Zod schemas. Never write hooks by hand.
- **lib/api-zod index**: Must only re-export `./generated/api`, not `./generated/types` — Orval regenerates with both and causes TS2308. Overwrite after every codegen run.
- **AI with graceful degradation**: Gemini calls are wrapped in try/catch; when `GEMINI_API_KEY` is absent or an error occurs, deterministic mock responses are returned so the UI always works.
- **Dark mode enforced**: `document.documentElement.classList.add("dark")` on mount — all UI built for dark theme.
- **Adapter pattern for departments**: Each department has a field-mapping layer that translates Single Window fields to department-specific field names, tracked in the `field_mappings` table.

## Product

- **Citizen Portal** (`/`): Submit a single-window application (form auto-routes to Food Safety + Labour); track real-time status with live timeline; respond to document requests; AI chatbot for guidance.
- **Officer Dashboard** (`/officer`): Department-scoped login; review application queue; approve/reject with notes; request additional documents from citizens.
- **Admin Console** (`/admin`): Live SLA monitor with charts; AI schema mapper (field mapping between systems); department onboarding; workflow state translator; real-time event bus log.

## User preferences

- Karnataka government branding, dark command-center aesthetic
- English / Kannada (ಕನ್ನಡ) bilingual support via language toggle
- Demo mode toggle on navbar for presentations

## Gotchas

- After running `pnpm --filter @workspace/api-spec run codegen`, overwrite `lib/api-zod/src/index.ts` to only export `./generated/api`.
- API server must be rebuilt (`pnpm --filter @workspace/api-server run build`) before restarting if route files changed — the workflow auto-rebuilds on start via `pnpm run dev`.
- `SESSION_SECRET` env var is set in Replit secrets.

## Pointers

- `lib/api-spec/openapi.yaml` — full API contract
- `lib/db/src/schema/applications.ts` — all 8 table definitions
- `.local/skills/pnpm-workspace` — workspace structure, TypeScript setup
