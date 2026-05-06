# BridgeSync

AI-driven government interoperability platform for Karnataka's Single Window Portal — enables citizens to submit one application that automatically routes to all required departments, with officers reviewing and approving in real time.

---

## What It Does

Citizens submit a single business license application. BridgeSync translates and routes it simultaneously to the **Food Safety Department** and **Labour Department**, each receiving fields mapped to their own native schema. Officers review independently; the overall status is computed intelligently across all departments.

### Key Features

- **Single Window Citizen Portal** — One form, routed to all departments automatically
- **AI Schema Mapping** — Gemini maps fields between department systems with confidence scores (falls back to mock if no API key)
- **AI Anomaly Detection** — Detects SLA breaches, idle applications, and processing bottlenecks
- **AI Citizen Assistant** — Multilingual chatbot (English / Kannada) for application guidance
- **Officer Dashboard** — Department-scoped queue, approve/reject with notes, document requests
- **Admin Console** — Live SLA monitor, schema mapper, department onboarding, real-time event bus log
- **Graceful AI degradation** — All Gemini calls fall back to deterministic mocks so the UI always works without an API key

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24, TypeScript 5.9 |
| Frontend | React 19, Vite 7, Wouter, TanStack Query, Tailwind CSS, shadcn/ui, Zustand, Recharts |
| Backend | Express 5 (port 8080, base path `/api`) |
| Database | PostgreSQL 16, Drizzle ORM |
| AI | Google Gemini 1.5 Flash — with mock fallbacks |
| Validation | Zod v4, drizzle-zod |
| API Codegen | Orval (from OpenAPI spec) |
| Build | esbuild (CJS bundle) |
| Package Manager | pnpm workspaces |

---

## Project Structure

```
Bridge-Sync-Hub-main/
├── artifacts/
│   ├── api-server/src/
│   │   ├── app.ts                           # Express app setup, mounts router at /api
│   │   ├── routes/                          # health, applications, departments, analytics, ai
│   │   └── lib/aiService.ts                 # Gemini integration + mock fallbacks
│   └── bridgesync/src/
│       ├── App.tsx                          # Router (wouter), QueryClient, dark mode
│       ├── pages/
│       │   ├── citizen/CitizenPortal.tsx    # Application form + tracker + AI chatbot
│       │   ├── officer/OfficerDashboard.tsx # Officer login + queue + approve/reject
│       │   └── admin/AdminDashboard.tsx     # SLA monitor, schema mapper, event bus
│       │       └── tabs/                    # SchemaMapperTab, OnboardingTab, WorkflowTab
│       ├── store/useDemoStore.ts            # Zustand: demo mode, language (EN/KN)
│       └── components/layout/Navbar.tsx
├── lib/
│   ├── api-spec/openapi.yaml                # OpenAPI spec — source of truth for all API contracts
│   ├── api-client-react/                    # Generated TanStack Query hooks (do not edit manually)
│   ├── api-zod/src/index.ts                 # Generated Zod schemas (only re-exports ./generated/api)
│   └── db/src/schema/applications.ts       # All 8 Drizzle table definitions
└── package.json                             # pnpm workspace root
```

---

## Database Schema

8 tables defined in `lib/db/src/schema/applications.ts`:

| Table | Purpose |
|---|---|
| `applications` | Master citizen application record |
| `dept_applications` | Per-department copy with native field mappings |
| `document_requests` | Documents requested by officers from citizens |
| `workflow_events` | Full audit trail of every state transition |
| `officers` | Officer roster per department |
| `field_mappings` | AI-generated field mappings between systems (with confidence scores) |
| `departments` | Onboarded departments with adapter status |
| `workflow_states` | State translation table (SW ↔ Food Safety ↔ Labour) |
| `event_log` | Real-time event bus log |

---

## Prerequisites

- **Node.js v20+** — https://nodejs.org (project was built on Node 24)
- **pnpm** — `npm install -g pnpm`
- **PostgreSQL 16** — https://www.postgresql.org/download/
- **Google Gemini API Key** *(optional)* — https://aistudio.google.com/apikey — AI features fall back to mock responses if absent

> **Windows:** After installing PostgreSQL, add `C:\Program Files\PostgreSQL\16\bin` to your system PATH.

---

## Local Setup

### 1. Install Dependencies

```bash
cd Bridge-Sync-Hub-main
```

> **Windows only** — the root `package.json` has a `preinstall` script that uses Linux shell syntax. Remove the `"preinstall"` line from `package.json` before installing:
> ```json
> // Delete this line from "scripts":
> "preinstall": "sh -c 'rm -f package-lock.json yarn.lock ...'",
> ```

```bash
pnpm install --ignore-scripts
```

---

### 2. Environment Variables

Create **`artifacts/api-server/.env`**:

```env
PORT=8080
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/bridgesync
GEMINI_API_KEY=your_gemini_api_key_here   # optional — mocks used if absent
NODE_ENV=development
```

Create **`artifacts/bridgesync/.env`**:

```env
PORT=21753
BASE_PATH=/
```

---

### 3. Set Up the Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE bridgesync;"

# Push the Drizzle schema
pnpm --filter @workspace/db run push
```

---

### 4. Run the App

```bash
# Terminal 1 — API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 21753)
pnpm --filter @workspace/bridgesync run dev
```

Open **http://localhost:21753** in your browser.

---

## Pages & Routes

| URL | Role | Description |
|---|---|---|
| `/` | Citizen | Submit application, track status by App ID, AI chatbot |
| `/officer` | Officer | Department login, application queue, approve/reject, request docs |
| `/admin` | Admin | SLA monitor, AI schema mapper, department onboarding, event bus |

---

## Commands Reference

```bash
# Run API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Run frontend (port 21753)
pnpm --filter @workspace/bridgesync run dev

# Full typecheck across all packages
pnpm run typecheck

# Build all packages
pnpm run build

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Regenerate API hooks + Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

> **After running codegen**, always overwrite `lib/api-zod/src/index.ts` to only export `./generated/api` — Orval regenerates with both exports and causes a TS2308 duplicate identifier error.

---

## API Endpoints

### Applications
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/applications` | Submit a new citizen application |
| `GET` | `/api/applications/:appId` | Full application detail + workflow timeline |
| `POST` | `/api/applications/:appId/respond-document` | Citizen responds to a document request |

### Departments & Officers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/departments` | List all onboarded departments |
| `POST` | `/api/departments` | Onboard a new department |
| `GET` | `/api/dept/:deptName/applications` | Applications queue for a department |
| `PUT` | `/api/dept/:deptName/applications/:appId/status` | Update application status (approve/reject/review) |
| `POST` | `/api/dept/:deptName/applications/:appId/request-document` | Request document from citizen |
| `GET` | `/api/officers/:deptName` | List officers for a department |

### AI Features
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/schema-map` | Map fields between two department systems |
| `POST` | `/api/ai/anomaly-scan` | Scan for SLA breaches and processing anomalies |
| `POST` | `/api/ai/schema-discover` | Discover fields for a department system type |
| `POST` | `/api/ai/chat` | Citizen assistant (multilingual, app-context-aware) |

### Analytics & Events
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/summary` | Overall stats (total, pending, approved, SLA breaches, avg processing days) |
| `GET` | `/api/analytics/dept-stats` | Per-department health scores and metrics |
| `GET` | `/api/events/stream` | Last 50 events from the audit log |
| `GET` | `/api/workflow-states` | Workflow state translation table |
| `POST` | `/api/workflow-states` | Add a workflow state mapping |

### Field Mappings
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/field-mappings/:source/:target` | Get saved field mappings between two systems |
| `PUT` | `/api/field-mappings/:id` | Confirm or correct a field mapping |

---

## Architecture Notes

- **Contract-first API** — `lib/api-spec/openapi.yaml` is the source of truth. Orval generates TanStack Query hooks and Zod schemas from it. Never write API hooks by hand.
- **Adapter pattern** — Each department has a field-mapping layer that translates Single Window fields to department-specific names, tracked in `field_mappings`.
- **AI with graceful degradation** — All Gemini calls are wrapped in try/catch. When `GEMINI_API_KEY` is absent or a call fails, deterministic mock responses are returned so the UI always works.
- **Dark mode enforced** — `document.documentElement.classList.add("dark")` on mount. All UI is built for the dark command-center aesthetic.
- **Bilingual** — English / Kannada (ಕನ್ನಡ) support via language toggle in the navbar.
- **Demo mode** — Navbar toggle for presentations.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `sh is not recognized` on Windows | Remove `"preinstall"` from root `package.json`, run `pnpm install --ignore-scripts` |
| `DATABASE_URL must be set` | Create `.env` in `artifacts/api-server/` with your `DATABASE_URL` |
| `PORT is required` | Ensure `.env` files exist in both `api-server/` and `bridgesync/` |
| `psql not found` | Add PostgreSQL `bin/` folder to system PATH |
| AI features return mock data | Add `GEMINI_API_KEY` to `artifacts/api-server/.env` — this is expected behavior without it |
| TS2308 after codegen | Overwrite `lib/api-zod/src/index.ts` to only `export * from './generated/api'` |
| Schema push fails | Ensure PostgreSQL is running and the `bridgesync` database exists |
| Replit plugin errors locally | Remove `runtimeErrorOverlay()` from `artifacts/bridgesync/vite.config.ts` |
