---
title: Providers
contents:
  items:
    - text: Endpoint
      href: "#endpoint"
    - text: Authentication
      href: "#authentication"
    - text: Query parameters
      href: "#query-parameters"
    - text: Response structure
      href: "#response-structure"
    - text: Examples
      href: "#examples"
    - text: Error responses
      href: "#error-responses"
---

Use this endpoint to retrieve providers from the register. Results are paginated and ordered by the last update time (newest first).

## Endpoint

```text
GET /api/v1/providers
```

## Authentication

Send a bearer token from the API clients section:

```text
Authorization: Bearer YOUR_TOKEN_VALUE
```

Tokens must be active, not revoked, and not expired.

## Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `changed_since` | false | ISO 8601 timestamp. Returns providers updated on or after this time. |
| `page` | false | Page number (defaults to `1`) |
| `per_page` | false | Page size (defaults to `50`, maximum `200`). |

## Response structure

```json
{
  "data": [
    {
      "id": "uuid",
      "operating_name": "string",
      "legal_name": "string",
      "ukprn": "string",
      "urn": "string|null",
      "provider_code": "string",
      "provider_type": "hei|school|other",
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp",
      "archived_at": "ISO8601 timestamp|null"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total_count": 120,
    "total_pages": 3
  }
}
```

## Examples

### Get the first page (default page size)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/v1/providers"
```

### Get providers updated since a date, with a custom page size

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/v1/providers?changed_since=2024-09-01T00:00:00Z&per_page=25&page=2"
```

## Error responses

### Missing or malformed header

```json
{
  "status": 401,
  "title": "Unauthorized",
  "details": "Missing or invalid Authorization header"
}
```

### Invalid, expired, or revoked token

```json
{
  "status": 403,
  "title": "Forbidden",
  "details": "Invalid, expired, or revoked token"
}
```

### Bad query parameters

For example, invalid date or negative pagination.

```json
{
  "status": 400,
  "title": "Bad Request",
  "details": "Invalid per_page: must be a positive integer"
}
```
