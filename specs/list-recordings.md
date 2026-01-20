# List Recordings Specification

**Status:** Planned
**Version:** 1.0
**Last Updated:** 2025-01-19

---

## 1. Overview

### Purpose

The `list_recordings` tool retrieves cloud recordings from a Zoom account. It allows users to browse their recorded meetings with optional date filtering, providing meeting metadata and recording counts to help identify which meeting contains the content they're looking for.

### Goals

- **Quick discovery** - List recordings with sensible defaults (last 7 days) for fast response
- **Flexible filtering** - Support custom date ranges for historical searches
- **Pagination support** - Handle accounts with many recordings gracefully
- **Rich metadata** - Return meeting topic, date, duration, and file counts

### Non-Goals

- **Full-text search** - Cannot search within recording content/transcripts
- **Filtering by participant** - Zoom API doesn't support this
- **Downloading files** - Use `get_recording` to obtain download URLs

---

## 2. Architecture

### Component Structure

```
src/
├── tools/
│   └── recordings/
│       ├── index.ts          # Tool definitions and exports
│       └── list.ts           # list_recordings implementation
├── clients/
│   └── zoom-client.ts        # Zoom API wrapper
└── types/
    └── recordings.ts         # Recording type definitions
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  list_recordings │────▶│   ZoomClient    │────▶│   Zoom API      │
│      tool        │     │ .listRecordings │     │ /users/me/      │
└─────────────────┘     └─────────────────┘     │   recordings    │
        │                                        └─────────────────┘
        ▼
┌─────────────────┐
│  MCP Response   │
│  (JSON array)   │
└─────────────────┘
```

---

## 3. Core Types

### 3.1 ListRecordingsInput

Input schema for the MCP tool.

```typescript
const ListRecordingsInputSchema = z.object({
  from: z.string()
    .optional()
    .describe('Start date in YYYY-MM-DD format (default: 7 days ago)'),
  to: z.string()
    .optional()
    .describe('End date in YYYY-MM-DD format (default: today)'),
  page_size: z.number()
    .int()
    .min(1)
    .max(300)
    .optional()
    .default(30)
    .describe('Number of recordings per page (max 300)'),
  next_page_token: z.string()
    .optional()
    .describe('Token for fetching next page of results'),
});

type ListRecordingsInput = z.infer<typeof ListRecordingsInputSchema>;
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| from | string | No | Start date (YYYY-MM-DD), defaults to 7 days ago |
| to | string | No | End date (YYYY-MM-DD), defaults to today |
| page_size | number | No | Results per page, 1-300, default 30 |
| next_page_token | string | No | Pagination token from previous response |

### 3.2 RecordingMeeting

Summary of a meeting with recordings.

```typescript
interface RecordingMeeting {
  uuid: string;              // Unique meeting instance ID
  id: number;                // Meeting ID (can repeat for recurring)
  topic: string;             // Meeting title
  start_time: string;        // ISO 8601 timestamp
  duration: number;          // Duration in minutes
  total_size: number;        // Total size of all recordings in bytes
  recording_count: number;   // Number of recording files
  host_email: string;        // Email of meeting host
  recording_types: string[]; // Types of recordings (MP4, M4A, etc.)
}
```

### 3.3 ListRecordingsOutput

Output returned by the tool.

```typescript
interface ListRecordingsOutput {
  meetings: RecordingMeeting[];
  next_page_token?: string;  // Token for next page (if more results)
  page_count: number;        // Total pages available
  total_records: number;     // Total meetings with recordings
}
```

---

## 4. API / Behaviors

### 4.1 MCP Tool Definition

```typescript
const listRecordingsTool = {
  name: 'list_recordings',
  description: 'List Zoom cloud recordings for the authenticated account. Returns meeting summaries with recording counts. Use get_recording with a meeting UUID to get download URLs.',
  inputSchema: {
    type: 'object',
    properties: {
      from: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format (default: 7 days ago)',
      },
      to: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format (default: today)',
      },
      page_size: {
        type: 'number',
        description: 'Number of recordings per page (1-300, default: 30)',
      },
      next_page_token: {
        type: 'string',
        description: 'Token for fetching next page of results',
      },
    },
  },
} as const;
```

### 4.2 Zoom API Call

| Attribute | Value |
|-----------|-------|
| Method | GET |
| Path | `/users/me/recordings` |
| Auth | Bearer token |

**Query Parameters:**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| from | No | 7 days ago | Start date (YYYY-MM-DD) |
| to | No | today | End date (YYYY-MM-DD) |
| page_size | No | 30 | Results per page |
| next_page_token | No | - | Pagination token |

**Response:**

```json
{
  "from": "2025-01-12",
  "to": "2025-01-19",
  "next_page_token": "abc123...",
  "page_count": 2,
  "page_size": 30,
  "total_records": 45,
  "meetings": [
    {
      "uuid": "gkABC123==",
      "id": 1234567890,
      "account_id": "xyz789",
      "host_id": "host123",
      "host_email": "user@example.com",
      "topic": "Weekly Team Standup",
      "type": 2,
      "start_time": "2025-01-19T10:00:00Z",
      "timezone": "America/Los_Angeles",
      "duration": 45,
      "total_size": 524288000,
      "recording_count": 3,
      "recording_files": [
        {
          "id": "file123",
          "meeting_id": "gkABC123==",
          "recording_start": "2025-01-19T10:00:00Z",
          "recording_end": "2025-01-19T10:45:00Z",
          "file_type": "MP4",
          "file_extension": "MP4",
          "file_size": 450000000,
          "status": "completed",
          "recording_type": "shared_screen_with_speaker_view"
        }
      ]
    }
  ]
}
```

### 4.3 Error Handling

| HTTP Code | Scenario | MCP Response |
|-----------|----------|--------------|
| 401 | Invalid/expired token | Re-authenticate and retry once |
| 404 | User not found | Return error: "Zoom user not found" |
| 429 | Rate limited | Return error with retry-after hint |
| 400 | Invalid date range | Return error: "Date range cannot exceed 1 month" |

---

## 5. Configuration

No additional configuration beyond authentication (see [zoom-auth.md](./zoom-auth.md)).

---

## 6. Security Considerations

### Data Exposure

- Recording metadata includes host email addresses
- Meeting topics may contain sensitive information
- No actual recording content is exposed (only metadata)

### Rate Limiting

- Zoom API has rate limits (varies by plan)
- The tool should handle 429 responses gracefully
- Default page_size of 30 balances usability and rate limits

---

## 7. Implementation Phases

| Phase | Description | Dependencies | Complexity |
|-------|-------------|--------------|------------|
| 1 | Define types and Zod schemas | None | Low |
| 2 | Implement ZoomClient.listRecordings | zoom-auth | Medium |
| 3 | Create list_recordings tool with date defaults | Phase 2 | Low |
| 4 | Add pagination support | Phase 3 | Low |

---

## 8. Example Usage

**Basic usage (last 7 days):**
```
User: "What Zoom recordings do I have?"
Claude: [calls list_recordings with no args]
```

**Custom date range:**
```
User: "Show me recordings from last month"
Claude: [calls list_recordings with from="2024-12-19" to="2025-01-19"]
```

**Pagination:**
```
User: "Show me more recordings"
Claude: [calls list_recordings with next_page_token from previous response]
```
