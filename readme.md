<div align="center">

# 🏛️ BridgeSync

### *One Application. Every Department. Zero Friction.*

**Submitted for [AI for Bharat Hackathon](https://aifor.bharathacks.in/)**

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-Visit%20App-4F46E5?style=for-the-badge)](https://bridge-sync-hub--madukalshashank.replit.app/)
[![Built with](https://img.shields.io/badge/Built%20with-React%20%2B%20Express%20%2B%20Gemini-0EA5E9?style=for-the-badge)](#tech-stack)
[![Hackathon](https://img.shields.io/badge/Hackathon-AI%20for%20Bharat-FF6B35?style=for-the-badge)](#)

</div>

---

## 🎯 The Problem

India's government licensing process forces citizens to visit **multiple department portals**, fill **redundant forms**, upload the **same documents repeatedly**, and track **separate application IDs** — all for a single business license.

Each department runs its own legacy system with **incompatible field schemas**, creating a fragmented, opaque experience for citizens and a siloed workflow nightmare for officers.

---

## 💡 Our Solution

**BridgeSync** is an AI-driven interoperability platform that sits between citizens and government departments.

A citizen fills **one unified form**. BridgeSync's AI engine:
1. **Translates** the form fields into each department's native schema automatically
2. **Routes** the application simultaneously to all required departments
3. **Tracks** the cross-department status in real time
4. **Assists** citizens in their language via an AI chatbot

Officers work inside their familiar department view. The citizen sees one unified status. No duplication. No lost applications.

> 🎥 **[Try the Live Demo →](https://bridge-sync-hub--madukalshashank.replit.app/)**

---

## 🖼️ Key Screens

| Portal | Who Uses It | What It Does |
|---|---|---|
| **Citizen Portal** `/` | Citizens | Submit one application, track real-time status, respond to document requests, chat with AI assistant |
| **Officer Dashboard** `/officer` | Dept. Officers | Review department-scoped queue, approve/reject with notes, request additional documents |
| **Admin Console** `/admin` | Administrators | Live SLA monitor, AI schema mapper, department onboarding, real-time event bus |

---

## ✨ Features

### 🤖 AI-Powered Core
- **Schema Mapper** — Gemini 1.5 Flash automatically maps fields between the Single Window schema and each department's native field names, with confidence scores and human-override support
- **Anomaly Detector** — Scans live data for SLA breaches, idle applications, and processing bottlenecks — surfaces actionable insights to admins
- **Citizen Assistant** — Context-aware AI chatbot that answers questions about application status in **English and Kannada (ಕನ್ನಡ)**
- **Schema Discovery** — AI infers field definitions for any department system type automatically

### ⚡ Real-Time Operations
- Live SLA monitor with auto-refresh every 30 seconds
- Full event bus log — every state transition across every department, in order
- Per-department health scores computed from SLA compliance, rejection rates, and processing time
- Workflow state translator — maps Single Window states to department-specific states

### 🏗️ Engineering
- **Contract-first API** — OpenAPI spec → Orval codegen → TanStack Query hooks (zero hand-written API calls)
- **Adapter pattern** — Field-mapping layer per department, stored and human-confirmable in `field_mappings` table
- **Graceful degradation** — All AI calls fall back to deterministic mock responses; the app works fully without a Gemini key
- **Full audit trail** — Every action logged to `workflow_events` and `event_log` tables

---

## 🏗️ Architecture

```
                        ┌──────────────────────────────┐
                        │        Citizen Browser        │
                        │   React 19 + Vite + shadcn   │
                        └──────────────┬───────────────┘
                                       │ /api (HTTP)
                        ┌──────────────▼───────────────┐
                        │       Express 5 API Server    │
                        │   TypeScript + Drizzle ORM   │
                        └──┬──────────┬────────────┬───┘
                           │          │            │
               ┌───────────▼──┐  ┌────▼────┐  ┌───▼──────────────┐
               │  PostgreSQL  │  │ Gemini  │  │  OpenAPI Contract │
               │  (8 tables)  │  │  1.5F   │  │  + Orval Codegen  │
               └──────────────┘  └─────────┘  └──────────────────┘
```

**Departments receive applications in their own native field format:**

```
Single Window Form
  citizenName → Food Safety: applicant_name  |  Labour: proprietor_name
  businessName → Food Safety: establishment_name  |  Labour: worker_establishment_name
  district → Food Safety: jurisdiction_area  |  Labour: district_code
  ... (10 fields, all AI-mapped)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 24, TypeScript 5.9 |
| **Frontend** | React 19, Vite 7, Wouter, TanStack Query, Tailwind CSS, shadcn/ui, Zustand, Recharts |
| **Backend** | Express 5 (port 8080, base path `/api`) |
| **Database** | PostgreSQL 16, Drizzle ORM |
| **AI** | Google Gemini 1.5 Flash — with deterministic mock fallbacks |
| **Validation** | Zod v4, drizzle-zod |
| **API Codegen** | Orval (OpenAPI → TanStack Query hooks + Zod schemas) |
| **Build** | esbuild (CJS bundle) |
| **Package Manager** | pnpm workspaces (monorepo) |

---

## 📁 Project Structure

```
Bridge-Sync-Hub/
├── artifacts/
│   ├── api-server/src/
│   │   ├── app.ts                           # Express setup, /api mount
│   │   ├── routes/                          # applications, departments, analytics, ai
│   │   └── lib/aiService.ts                 # Gemini integration + mock fallbacks
│   └── bridgesync/src/
│       ├── App.tsx                          # Router, QueryClient, dark mode
│       ├── pages/
│       │   ├── citizen/CitizenPortal.tsx    # Form + tracker + chatbot
│       │   ├── officer/OfficerDashboard.tsx # Queue + approve/reject
│       │   └── admin/AdminDashboard.tsx     # SLA + schema mapper + event bus
│       └── store/useDemoStore.ts            # Zustand: demo mode, language
├── lib/
│   ├── api-spec/openapi.yaml                # Source of truth for all API contracts
│   ├── api-client-react/                    # Generated TanStack Query hooks
│   ├── api-zod/                             # Generated Zod schemas
│   └── db/src/schema/applications.ts       # All 8 Drizzle table definitions
└── package.json                             # pnpm workspace root
```

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `applications` | Master citizen application record |
| `dept_applications` | Per-department copy with native field mapping |
| `document_requests` | Documents requested by officers from citizens |
| `workflow_events` | Full audit trail of every state transition |
| `officers` | Officer roster per department |
| `field_mappings` | AI-generated field mappings with confidence scores |
| `departments` | Onboarded departments with adapter status |
| `workflow_states` | State translation (Single Window ↔ departments) |
| `event_log` | Real-time event bus log |

---

## 🚀 Run Locally

### Prerequisites

- **Node.js v20+** — https://nodejs.org
- **pnpm** — `npm install -g pnpm`
- **PostgreSQL 16** — https://www.postgresql.org/download/
- **Gemini API Key** *(optional — app works without it)* — https://aistudio.google.com/apikey

### 1. Install

```bash
git clone <repo-url>
cd Bridge-Sync-Hub-main
pnpm install --ignore-scripts
```

> **Windows only:** Remove the `"preinstall"` line from root `package.json` (it uses Linux shell syntax), then run the install command above.

### 2. Environment Variables

**`artifacts/api-server/.env`**
```env
PORT=8080
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/bridgesync
GEMINI_API_KEY=your_key_here    # optional
NODE_ENV=development
```

**`artifacts/bridgesync/.env`**
```env
PORT=21753
BASE_PATH=/
```

### 3. Database Setup

```bash
psql -U postgres -c "CREATE DATABASE bridgesync;"
pnpm --filter @workspace/db run push
```

### 4. Start

```bash
# Terminal 1 — API (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 21753)
pnpm --filter @workspace/bridgesync run dev
```

Open **http://localhost:21753**

---

## 📡 API Reference

### Applications
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/applications` | Submit a new citizen application |
| `GET` | `/api/applications/:appId` | Full details + workflow timeline |
| `POST` | `/api/applications/:appId/respond-document` | Citizen responds to document request |

### Departments & Officers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/departments` | List all onboarded departments |
| `POST` | `/api/departments` | Onboard a new department |
| `GET` | `/api/dept/:deptName/applications` | Department application queue |
| `PUT` | `/api/dept/:deptName/applications/:appId/status` | Update status (approve/reject) |
| `POST` | `/api/dept/:deptName/applications/:appId/request-document` | Request document from citizen |
| `GET` | `/api/officers/:deptName` | List department officers |

### AI
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/schema-map` | Map fields between department systems |
| `POST` | `/api/ai/anomaly-scan` | Detect SLA breaches and anomalies |
| `POST` | `/api/ai/schema-discover` | Discover fields for a department system |
| `POST` | `/api/ai/chat` | Multilingual citizen assistant |

### Analytics & Events
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/summary` | Overall stats and KPIs |
| `GET` | `/api/analytics/dept-stats` | Per-department health scores |
| `GET` | `/api/events/stream` | Last 50 audit log events |

---

## 🧠 Key Design Decisions

**Contract-first API** — The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the single source of truth. Orval generates all TanStack Query hooks and Zod validation schemas from it automatically. No API code is written by hand.

**Graceful AI degradation** — Every Gemini call is wrapped in try/catch with a deterministic fallback. The platform works fully in demo environments without an API key — judges will see real functionality regardless.

**Adapter pattern for interoperability** — Rather than forcing departments to change their systems, BridgeSync adds a translation layer. Field mappings are stored, human-confirmable, and improvable over time.

**Full observability** — Every state change across every department is timestamped and logged. Admins get a real-time event bus and officers get a complete workflow timeline per application.

---

## 🔧 Developer Commands

```bash
pnpm --filter @workspace/api-server run dev     # Run backend
pnpm --filter @workspace/bridgesync run dev     # Run frontend
pnpm --filter @workspace/db run push            # Push DB schema
pnpm --filter @workspace/api-spec run codegen   # Regenerate API hooks from OpenAPI
pnpm run typecheck                              # Full typecheck
pnpm run build                                  # Build all packages
```

> **Post-codegen:** Always overwrite `lib/api-zod/src/index.ts` to only `export * from './generated/api'` — Orval generates a duplicate export that causes TS2308.

---

## 🤝 Contributing

This project was built for the **AI for Bharat Hackathon**. Contributions, issues, and feature suggestions are welcome.

---

<div align="center">

**Built with ❤️ for AI for Bharat Hackathon**

[🚀 Live Demo](https://bridge-sync-hub--madukalshashank.replit.app/) • [📋 API Spec](lib/api-spec/openapi.yaml) • [🗄️ Schema](lib/db/src/schema/applications.ts)

</div>
