# API Routes

## Base URL

```
https://qlfi30snpa.execute-api.us-east-1.amazonaws.com
```

All responses include these headers:
```
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Methods: POST, GET, OPTIONS
```

---

## POST `/signal`

Validates and stores a silence signal ephemerally.

### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ts` | integer | ✅ | Unix timestamp (seconds). Must be within ±5 minutes of server time. |
| `geo` | string | ✅ | Geohash of the location (minimum 3 characters). |
| `noise_bucket` | string | ✅ | One of: `very_quiet`, `quiet`, `moderate`, `loud` |

**Example request:**
```json
POST /signal
Content-Type: application/json

{
  "ts": 1710000000,
  "geo": "tdr5",
  "noise_bucket": "quiet"
}
```

### Responses

| Status | Description | Body |
|--------|-------------|------|
| `200` | Signal stored successfully | `{"message": "Silence remembered briefly."}` |
| `400` | Validation error | `{"error": "<description>"}` |
| `500` | Unexpected server error | `{"error": "Internal server error"}` |

**Possible 400 errors:**
- `"Malformed JSON"` — request body is not valid JSON
- `"Invalid or missing 'ts'"` — `ts` is not an integer
- `"Timestamp is too far from server time"` — `ts` is more than 5 minutes away from server clock
- `"Invalid or missing 'geo'"` — `geo` is missing or shorter than 3 characters
- `"Invalid 'noise_bucket'"` — value is not in the allowed set

---

## GET `/quiet/{geo}`

Returns an aggregated quiet score for the given geohash tile over the last 30 minutes.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `geo` | string | Geohash tile to query (minimum 3 characters) |

**Example request:**
```
GET /quiet/tdr5
```

### Responses

| Status | Description |
|--------|-------------|
| `200` | Aggregated quiet score |
| `400` | Invalid geo parameter |

**Success response (200):**
```json
{
  "geo": "tdr5",
  "quiet_score": 0.85,
  "confidence": "medium",
  "window_minutes": 30
}
```

| Field | Type | Description |
|-------|------|-------------|
| `geo` | string | The queried geohash |
| `quiet_score` | float | Weighted score from 0.0 (loud) to 1.0 (very quiet) |
| `confidence` | string | `low` (≤5 signals), `medium` (6-20), `high` (>20) |
| `window_minutes` | integer | Time window used for aggregation (always 30) |

**No data response (200):**
```json
{
  "geo": "tdr5",
  "quiet_score": 0.0,
  "confidence": "low",
  "window_minutes": 30
}
```

**Error response (400):**
```json
{
  "error": "Invalid geo"
}
```
