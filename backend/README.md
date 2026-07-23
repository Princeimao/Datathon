# Crime Intelligence Backend

Backend API for ingesting Karnataka State Police crime records, creating graph relationships, and serving dashboards for hotspots, alerts, anomaly detection, and risk areas.

## What It Provides

- Single and bulk incident ingestion.
- BullMQ-backed asynchronous intelligence jobs using Redis.
- Worker process for relationship analysis.
- Advanced relationship finder using co-incident links, repeat suspects, shared vehicles, shared contacts, recurring modus operandi, district/category overlap, and confidence scoring.
- Dashboard APIs for district hotspots, temporal trends, emerging alerts, risk areas, and anomalies.

## Run Locally

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Start Postgres and Redis:

```bash
docker compose up -d
```

3. Apply/generate Prisma artifacts as your migration flow requires:

```bash
npm run prisma:validate
npm run prisma:generate
```

4. Start the API:

```bash
npm run dev
```

5. Start the BullMQ worker in a second terminal:

```bash
npm run worker
```

## Main Endpoints

- `GET /health`
- `POST /api/v1/incidents`
- `POST /api/v1/incidents/bulk`
- `GET /api/v1/incidents`
- `POST /api/v1/relationships/analyze/incident/:incidentId`
- `POST /api/v1/relationships/rebuild`
- `GET /api/v1/relationships/graph?personId=:id&depth=2`
- `GET /api/v1/analytics/hotspots?days=30`
- `GET /api/v1/analytics/trends?days=90`
- `GET /api/v1/analytics/alerts?days=14&baselineDays=90`
- `GET /api/v1/analytics/risk-areas?days=180`
- `GET /api/v1/analytics/anomalies?days=30`
- `GET /api/v1/visualization/map/districts`
- `GET /api/v1/visualization/map/points?district=Bengaluru%20Urban&category=Theft`
- `GET /api/v1/visualization/map/clusters?district=Bengaluru%20Urban&precision=2`
- `GET /api/v1/visualization/alerts?days=14&baselineDays=90`
- `GET /api/v1/visualization/react-flow?personId=:id&depth=2`
- `PATCH /api/v1/visualization/graph/person/:personId`
- `PATCH /api/v1/visualization/graph/incident/:incidentId`
- `PATCH /api/v1/visualization/graph/location/:locationId`
- `POST /api/v1/visualization/graph/relationships`
- `PATCH /api/v1/visualization/graph/relationships/:relationshipId`
- `DELETE /api/v1/visualization/graph/relationships/:relationshipId`
- `POST /api/v1/case-similarity/predict`
- `POST /api/v1/case-similarity/statement/parse`
- `POST /api/v1/case-similarity/apply`
- `POST /api/v1/data-import/bulk`

## Example Single Incident

```json
{
  "incidentNumber": "KSP-2026-0001",
  "title": "Chain snatching near market",
  "category": "Theft",
  "subCategory": "Chain Snatching",
  "occurrenceAt": "2026-05-30T18:30:00.000Z",
  "location": {
    "name": "KR Market",
    "city": "Bengaluru",
    "district": "Bengaluru Urban",
    "state": "Karnataka",
    "latitude": 12.9601,
    "longitude": 77.5767
  },
  "persons": [
    {
      "firstName": "Unknown",
      "nickName": ["Red Helmet"],
      "role": "SUSPECT",
      "phoneNumbers": ["+919999999999"],
      "confidence": 0.7
    },
    {
      "firstName": "Victim",
      "lastName": "One",
      "role": "VICTIM"
    }
  ],
  "vehicles": [
    {
      "registrationNo": "KA01AB1234",
      "color": "Black",
      "role": "getaway vehicle",
      "relatedPersonPhones": ["+919999999999"]
    }
  ],
  "modusOperandi": [
    {
      "code": "MO-CHAIN-BIKE",
      "title": "Two-wheeler chain snatching",
      "confidence": 0.85
    }
  ]
}
```

The API returns `202 Accepted` and queues relationship analysis. The worker consumes the Redis queue and publishes job lifecycle events on the configured Redis channel.

## Case Similarity Prediction

`POST /api/v1/case-similarity/predict` accepts a context incident/case, a free-text investigator statement, or extracted entities. It returns candidate incidents, signal scores, and proposed actions without changing any source record.

Example:

```json
{
  "incidentId": "existing-incident-id",
  "statement": "A bike KA01AB1234 was stolen near KR Market. The same bike was seen in an ATM loot case. Phone 9876543210 was found with an unidentified dead person.",
  "limit": 20
}
```

To apply a confirmed recommendation, send one returned `proposedActions[]` item to `POST /api/v1/case-similarity/apply`.
