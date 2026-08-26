# KSP Intel — Crime Intelligence Platform

A full-stack crime intelligence platform for police investigations. It ingests
FIR / case data, links people, phones, vehicles, locations, organizations and
evidence into an intelligence graph, and lets investigators search, visualize,
and analyze cases from many perspectives — including **image-based similarity
search**, a **structured data-entry workbench**, and an interactive **Case
Board**.

| Layer               | Tech                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| Frontend            | React 19, TypeScript, Vite, Tailwind CSS, React Flow, Leaflet, Recharts |
| Backend             | Node.js (Express 5), TypeScript, Prisma ORM                             |
| Database            | PostgreSQL (Prisma / `@prisma/adapter-pg`)                              |
| Vector search       | Pinecone (`llama-text-embed-v2`, namespace `case`)                      |
| Embeddings / vision | Ollama (`nomic-embed-text`, `llava`)                                    |
| Object storage      | Catalyst Stratus                                                        |

---

## Table of Contents

- [Screens / Features](#screens--features)
- [Architecture](#architecture)
- [Backend API Reference](#backend-api-reference)
- [Data Model](#data-model)
- [Setup Guide](#setup-guide)
  - [Prerequisites](#prerequisites)
  - [1. Backend](#1-backend)
  - [2. Frontend](#2-frontend)
  - [3. Docker Compose (optional)](#3-docker-compose-optional)
- [How the Features Work](#how-the-features-work)
- [Project Scripts](#project-scripts)
- [Troubleshooting](#troubleshooting)

---

## Screens / Features

### Dashboard (`/`)

Aggregated crime intelligence overview:

- Crime-type mix, district/station statistics, temporal trends
- Predictive risk areas with forecast trend
- Anomaly detection alerts and repeat-offender tracking
- Time-line statistics (day / week / month / year)
- Filterable by state, crime type and time grain

### Crime Map (`/map`)

Leaflet-based geospatial view of cases with district boundaries, case points,
crime-type filters and police-station drill-down. Backed by
`/visualization/geospatial`, `/visualization/map-data` and the location
boundary endpoints.

### Case Board (`/graph`)

Interactive investigation board (React Flow):

- **Cross-entity search** across cases, people, evidence/media, statements,
  phone numbers, vehicles, locations and organizations (`/visualization/search`)
- Search results are linked to the scoped graph — click any result to open the
  connected network of that case or person
- Graph filters by case ID, person ID, district, category, and free text
- Select any node/edge to inspect and **save verified corrections** back to the
  database
- Supports deep links such as `/graph?caseId=...`

### Trend Analysis (`/trend`)

Temporal trend alerts with spike detection, district and crime-type breakdowns.

### Similarity Lab (`/similarity`)

Investigation intelligence search:

- **Structured search** by statement, phone number, person, vehicle, modus
  operandi, evidence, case, crime, location or organization
- **Image search** — upload an image; it is described with a vision model and
  searched against the vector index for visually/semantically similar records.
  The same image is also matched by SHA-256 against stored evidence media
  (exact/duplicate detection)
- **Combined search** — optionally combine an image with a structured field
  query (e.g. image + phone number)
- Every match opens a full **Investigation view** (people, phones, vehicles,
  locations, evidence/media with thumbnails, modus operandi, related records)
  with a link to open the case in the Case Board

### New Case (`/insert`)

Structured case/person data entry:

- Case details, people (with role/age/gender/aliases/notes), phones, vehicles,
  locations, organizations, modus operandi and a free-text statement
- **Image and video upload** with a category per file:
  `evidence`, `suspect`, `weapon`, `victim`, `location`, `document`, `other`
- Media is uploaded directly to object storage and stored as evidence records
  with the chosen category; text is embedded and indexed for similarity search
- Success screen links to the new case in the Case Board

### Data Import (`/import`)

Bulk ingestion of `.json`, `.csv` and free-text note files. Each record is
parsed and queued for intelligence-graph analysis (`POST /api/v1/data/process`).

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                       │
│  ─ Dashboard │ Crime Map │ Case Board │ Trend │ Similarity Lab │
│  ─ New Case  │ Data Import                                     │
└───────────────┬────────────────────────────────────────────────┘
                │  HTTP (axios) — http://localhost:3000/api/v1
┌───────────────▼────────────────────────────────────────────────┐
│  Backend (Express)                                             │
│  /visualization  /similarity  /ingest  /storage  /data         │
│  /location       /police                                       │
└───┬──────────┬──────────┬────────────┬─────────────────────────┘
    │          │          │            │
    ▼          ▼          ▼            ▼
 PostgreSQL   Pinecone   Ollama      Catalyst Stratus
 (Prisma)     (vector)   (embed /    (media)
               search      vision)
```

**Key services (backend)**

| File                                           | Responsibility                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/services/relationship.service.ts`         | Persists an extracted/intake payload into the full relational graph (case, people, phones, vehicles, locations, orgs, evidence, MO, relationships) in a transaction |
| `src/services/case-investigation.service.ts`   | Shared includes for search results and the full investigation view                                                                                                  |
| `src/services/pinecone.service.ts`             | Vector search (`searchRecords`), image description (`llava`), case indexing (`upsertRecords`)                                                                       |
| `src/services/storage.service.ts`              | Presigned PUT/GET URLs and server-side base64 uploads                                                                                                               |
| `src/services/structured-ingestion.service.ts` | Maps the structured form payload + media into a `CrimeExtractionResult`                                                                                             |
| `src/services/ollama.service.ts`               | Text embeddings (`nomic-embed-text`) with a deterministic fallback                                                                                                  |
| `src/services/media-intelligence.service.ts`   | Analyzes uploaded media for evidence/person/vehicle extraction                                                                                                      |
| `src/services/catalyst.service.ts`             | Object-storage helpers (`uploadToStratus`) and job queue (`submitCatalystJob`)                                                                                      |

---

## Backend API Reference

All routes are prefixed with `/api/v1`.

### Visualization (`/api/v1/visualization`)

| Method | Path                                       | Description                                                                                                                         |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/geospatial`                              | Case points with location, district, station and crime type                                                                         |
| GET    | `/district-stats`                          | District/station case counts and type/status breakdowns                                                                             |
| GET    | `/trends`                                  | 30-day spike alerts with severity                                                                                                   |
| GET    | `/network`                                 | Person-centric intelligence graph. Query params: `q`, `incidentId`/`caseId`, `personId`, `district`, `category`, `depth`, `limit`   |
| GET    | `/repeat-offenders`                        | Persons in 2+ cases with calculated risk scores                                                                                     |
| GET    | `/associations`                            | People linked through shared phones/vehicles/locations/orgs                                                                         |
| GET    | `/predictive`                              | District risk predictions and forecasts                                                                                             |
| GET    | `/anomalies`                               | Anomalous case patterns                                                                                                             |
| GET    | `/timeline?groupBy=day\|week\|month\|year` | Temporal statistics                                                                                                                 |
| GET    | `/similar-persons/:personId`               | Similar persons with confidence and reasons                                                                                         |
| GET    | `/case-board/:caseId`                      | Full investigation graph for one case (nodes/edges)                                                                                 |
| GET    | `/search?q=&types=&limit=`                 | **Cross-entity search** — `types` is a comma-separated list of `case,person,evidence,statement,phone,vehicle,location,organization` |
| GET    | `/dashboard-summary`                       | Aggregated dashboard data (state/crimeType/groupBy filters)                                                                         |
| GET    | `/map-data`                                | Map points with filters                                                                                                             |

### Similarity (`/api/v1/similarity`)

| Method | Path                     | Description                                                                                                                                                                                                                                                                              |
| ------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/search`                | Combined search. Body: `{ type?, value?, imageUrl?, objectKey?, imageHash?, combinedType?, limit? }`. `type` ∈ `statement, phone, person, vehicle, mo, evidence, case, crime, location, organization, image`. Returns `{ results: { database, image, related } }` with full case objects |
| GET    | `/investigation/:caseId` | Full investigation view for a matched case/person                                                                                                                                                                                                                                        |

### Ingest (`/api/v1/ingest`)

| Method | Path          | Description                                                                                |
| ------ | ------------- | ------------------------------------------------------------------------------------------ |
| POST   | `/structured` | Create a case from structured data + media (see [Structured payload](#structured-payload)) |

### Storage (`/api/v1/storage`)

| Method | Path                     | Description                                                                                        |
| ------ | ------------------------ | -------------------------------------------------------------------------------------------------- |
| POST   | `/signed-url`            | Presigned PUT URL. Body: `{ fileName, contentType, keyPrefix? }` → `{ uploadUrl, objectKey, ... }` |
| GET    | `/signed-get?objectKey=` | Presigned GET URL for displaying/downloading an object                                             |

### Data (`/api/v1/data`)

| Method | Path       | Description                                                                                                                                |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/process` | Bulk import. Body: `{ format: "json"\|"csv", fileName, records?/content? }` or an array of `{ firText }` records. Queues intelligence jobs |

### Location (`/api/v1/location`)

| Method | Path                              | Description               |
| ------ | --------------------------------- | ------------------------- |
| GET    | `/states`                         | Active states             |
| GET    | `/districts`                      | Active districts          |
| GET    | `/states/:stateId/boundary`       | State GeoJSON boundary    |
| GET    | `/districts/:districtId/boundary` | District GeoJSON boundary |

### Police (`/api/v1/police`)

| Method | Path            | Description              |
| ------ | --------------- | ------------------------ |
| GET    | `/city/:city`   | Police stations by city  |
| GET    | `/state/:state` | Police stations by state |

### Structured payload

```jsonc
{
  "case": {
    "title": "Chain snatching near KR Market",
    "caseNumber": "KSP-2026-0001", // optional
    "crimeType": "ROBBERY", // HOMICIDE | ROBBERY | ASSAULT | ... | OTHER
    "caseStatus": "OPEN", // OPEN | CLOSED | COLD
    "incidentDate": "2026-05-30T18:30:00.000Z",
    "location": "Bengaluru Urban",
    "description": "...",
  },
  "persons": [
    {
      "name": "Rahul",
      "role": "SUSPECT",
      "age": 34,
      "gender": "MALE",
      "aliases": ["Red Helmet"],
      "notes": "...",
      "confidence": 1,
    },
  ],
  "phones": [
    { "number": "+919999999999", "countryCode": "+91", "confidence": 1 },
  ],
  "vehicles": [
    {
      "registrationNumber": "KA01AB1234",
      "make": "Honda",
      "color": "Black",
      "confidence": 1,
    },
  ],
  "locations": [
    {
      "address": "KR Market",
      "district": "Bengaluru Urban",
      "station": "KR Market PS",
      "locationType": "CRIME_SCENE",
      "confidence": 1,
    },
  ],
  "organizations": [
    { "name": "Alpha Gang", "organizationType": "Gang", "confidence": 1 },
  ],
  "modusOperandi": {
    "name": "Two-wheeler chain snatching",
    "description": "...",
    "weaponType": null,
    "timePattern": "Evening",
  },
  "statement": "Free-text FIR / witness statement...",
  "media": [
    {
      "objectKey": "evidence/suspects/1759...-abc.jpg",
      "fileName": "suspect.jpg",
      "contentType": "image/jpeg",
      "category": "suspect",
      "label": "Primary suspect",
      "description": "...",
      "personName": "Rahul",
      "fileHash": "sha256hex...",
    },
  ],
  "relationships": [],
}
```

`media[].category` — one of `evidence | suspect | weapon | victim | location | document | other`.
Files can be supplied either as an already-uploaded `objectKey` (recommended,
uploaded first via `/storage/signed-url`) or as a `base64` string (uploaded
server-side).

---

## Data Model

Defined in `backend/prisma/schema.prisma` (Prisma 7, PostgreSQL). Core models:

- **Case** — FIR/case record with master references (`CaseCategory`,
  `GravityOffence`, `CrimeHead`/`CrimeSubHead`, `CaseStatusMaster`), police unit,
  court, dates, risk/priority scores, AI summary/classification.
- **Person / CasePerson** — people and their role in each case
  (SUSPECT, VICTIM, WITNESS, …), aliases, notes.
- **Phone / PhoneOwner / CasePhone** — numbers, subscribers and case links.
- **Vehicle / VehicleOwner / CaseVehicle** — registrations, owners and case links.
- **Location / CaseLocation / PersonLocation** — geocoded places, crime scenes,
  residences and residents.
- **Organization / OrganizationMember / CaseOrganization** — groups and memberships.
- **PersonRelationship** — person-to-person links with type, confidence, source
  and evidence reference.
- **Evidence** — media/documents with type (IMAGE, VIDEO, DOCUMENT, PHYSICAL, …),
  storage URL, SHA-256 hash, AI summary/classification and uploader.
- **ModusOperandi** — crime patterns (target/weapon/time/vehicle/entry/escape).
- **Embedding** — vector metadata mapping entities to vector IDs.
- **InvestigationEvent**, **ArrestSurrender**, **Chargesheet**, **CaseSimilarity**,
  plus master-data tables (`State`, `District`, `PoliceUnit`, `Employee`, `Court`,
  `Act`/`Section`, religion/caste/occupation masters).

---

## Setup Guide

### Prerequisites

- **Node.js 18+** and npm
- **PostgreSQL** (local or hosted; the app uses a Prisma Data Proxy / Postgres URL)
- **Pinecone** index/API key (vector search). The index is auto-created as
  `datathon` with `llama-text-embed-v2` on first boot if it does not exist.
- **Stratus compatible object storage** credentials (media uploads)
- Optional:
  - **Redis** — used by the BullMQ job queue; ingestion falls back to inline
    processing when Redis is unavailable
  - **Ollama** — embeddings (`nomic-embed-text`) and image description (`llava`);
    a deterministic fallback vector is used when unavailable

### 1. Backend

```bash
cd backend
npm install

# Copy the example env and fill in real values
cp .env.example .env
```

Minimal `.env` for the current stack:

```bash
PORT=3000

# PostgreSQL / Prisma
DATABASE_URL="postgres://user:password@host:5432/postgres?sslmode=require"

# Pinecone (API key)
PINECONE_URL="pcsk_..."

# Optional — Ollama embeddings + vision
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"

# Optional — Redis job queue
REDIS_URL="redis://127.0.0.1:6379"
```

> The `prisma.config.ts` reads `DATABASE_URL` for migrations, while
> `src/config/prisma.config.ts` wires the runtime adapter.

Generate the Prisma client and apply migrations:

```bash
npm run prisma:generate
npx prisma migrate deploy
```

Start the API (port 3000):

```bash
npm run dev        # development (jiti)
npm run build      # production build
npm start          # run dist/index.js
```

### 2. Frontend

```bash
cd frontend
npm install

cp .env.example .env
```

Example `.env`:

```bash
VITE_MAP_API="https://countriesnow.space/api/v0.1/countries"
VITE_BACKEND_API="http://localhost:3000/api/v1"
```

> The axios client in `src/services/api.ts` currently hardcodes
> `http://localhost:3000/api/v1`. Update that constant if your backend runs on a
> different host/port.

Run the dev server:

```bash
npm run dev        # http://127.0.0.1:5173
npm run build      # typecheck + production build
```

### 3. Docker Compose (optional)

`compose.yml` at the repo root runs the prebuilt backend image on port 3000:

```bash
docker compose up -d
```

It reads `backend/.env` for configuration. The frontend and database are
intended to be run/hosted separately.

---

## How the Features Work

### Image / similarity search pipeline

1. The frontend uploads the image directly to object storage via a presigned
   PUT URL and computes its SHA-256 (`crypto.subtle`).
2. `POST /api/v1/similarity/search` resolves the image (URL, `objectKey`, or
   base64) into a signed GET URL.
3. The backend:
   - describes the image with the `llava` vision model, then queries Pinecone
     `searchRecords` (semantic vector search);
   - matches the SHA-256 against `Evidence.fileHash` (exact duplicate);
   - optionally runs a structured database search (`combinedType`).
4. Matched case IDs are enriched into full case objects (people, phones,
   vehicles, locations, evidence, MO) and returned together.
5. The investigator opens the **Investigation view**, or jumps to the **Case
   Board** graph for that case.

### Structured insertion pipeline

1. The investigator fills in case/person/vehicle/location/org/MO/statement data
   and attaches images/videos, choosing a category per file.
2. Each file is uploaded to storage; the frontend keeps `objectKey`, `fileHash`
   and the chosen category.
3. `POST /api/v1/ingest/structured` maps the payload to a
   `CrimeExtractionResult`, persists the whole graph in one transaction
   (`relationshipService`), stores evidence with the category in
   `aiClassification`/`extractedData`, and indexes the case summary for vector
   search.

### Case Board search

`GET /api/v1/visualization/search` runs parallel searches across cases, people,
evidence, statements (role notes + statement evidence), phones, vehicles,
locations and organizations. The frontend renders results grouped by type and
links each hit back into the graph (`/network?incidentId=…` or
`/network?personId=…`).

---

## Project Scripts

**Backend** (`backend/package.json`)

| Script                    | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `npm run dev`             | Start API with `jiti`                                    |
| `npm start`               | Run compiled `dist/index.js`                             |
| `npm run build`           | Typecheck and compile with `tsc -b`                      |
| `npm run prisma:generate` | Generate Prisma client                                   |
| `npm run prisma:validate` | Validate the schema                                      |
| `npm run seed`            | Run `prisma/seed.ts`                                     |
| `npm run process`         | Run the process worker (`src/workers/process.worker.ts`) |

**Frontend** (`frontend/package.json`)

| Script            | Purpose                                 |
| ----------------- | --------------------------------------- |
| `npm run dev`     | Vite dev server (127.0.0.1:5173)        |
| `npm run build`   | Typecheck (`tsc -b`) + production build |
| `npm run preview` | Preview the production build            |

---

## Troubleshooting

- **Server fails to start with a Pinecone error** — the app initializes the
  Pinecone index on boot. Ensure `PINECONE_URL` is valid and the network allows
  access to the Pinecone API.
- **`Redis connect ECONNREFUSED` logs on boot** — non-fatal. The job queue is
  lazy; if Redis is unreachable, ingestion runs inline and returns a synthetic
  job ID.
- **Image search returns nothing** — vector search requires the vision model
  (`llava` via Ollama) _or_ existing Pinecone records; exact matches require the
  probe image hash to equal a stored `Evidence.fileHash`. Structured/database
  search works independently of these services.
- **Evidence thumbnails missing** — the frontend refreshes a signed GET URL for
  the stored `objectKey` at render time. If the object was deleted or the
  storage credentials are invalid, the thumbnail is replaced by an icon.
- **Google Maps key errors** — only relevant to legacy map layers; the Crime Map
  uses Leaflet and does not require `VITE_GOOGLE_MAPS_API_KEY`.
