# List Recordings Implementation

**Spec:** [specs/list-recordings.md](../specs/list-recordings.md)
**Status:** In Progress
**Last Updated:** 2026-01-20 (P2.2 complete)

---

## Dependencies

- ⏳ zoom-auth (pending)

---

## Overview

Implement the `list_recordings` MCP tool that lists Zoom cloud recordings with optional date filtering. Defaults to last 7 days when no date range specified.

---

## Tasks

### Priority 1: Types and Schemas

#### P1.1: Create recording type definitions

- [x] Define TypeScript types for recordings
  - **File:** `src/types/recordings.ts`
  - **Refs:** specs/list-recordings.md §4.2
  - **Complexity:** medium
  - **Details:**
    - `ListRecordingsInput` (Zod schema):
      - `from?: string` - Start date YYYY-MM-DD
      - `to?: string` - End date YYYY-MM-DD
      - `page_size?: number` - 1-300, default 30
      - `next_page_token?: string` - Pagination token
    - `ListRecordingsOutput`:
      - `meetings: RecordingMeeting[]`
      - `next_page_token?: string`
      - `page_count: number`
      - `total_records: number`
    - `RecordingMeeting`:
      - `uuid: string`
      - `id: number`
      - `topic: string`
      - `start_time: string` (ISO 8601)
      - `duration: number` (minutes)
      - `total_size: number` (bytes)
      - `recording_count: number`
      - `host_email: string`
      - `recording_types: string[]`

### Priority 2: Zoom Client

#### P2.1: Create ZoomClient class

- [x] Implement Zoom API wrapper for recordings
  - **File:** `src/clients/zoom-client.ts`
  - **Refs:** specs/list-recordings.md §4.3
  - **Complexity:** medium
  - **Dependencies:** zoom-auth
  - **Details:**
    - Constructor accepts `ZoomAuth` instance
    - Base URL: `https://api.zoom.us/v2`
    - Private helper for authenticated requests
    - Include `Authorization: Bearer {token}` header

#### P2.2: Implement listRecordings method

- [x] Add method to fetch recordings from Zoom API
  - **File:** `src/clients/zoom-client.ts`
  - **Refs:** specs/list-recordings.md §4.3
  - **Complexity:** medium
  - **Dependencies:** P2.1
  - **Details:**
    - Endpoint: `GET /users/me/recordings`
    - Query params: `from`, `to`, `page_size`, `next_page_token`
    - Handle date defaults:
      - `from`: 7 days ago (YYYY-MM-DD)
      - `to`: today (YYYY-MM-DD)
    - Handle errors:
      - 401: Re-fetch token and retry once
      - 404: `"Zoom user not found"`
      - 429: `"Rate limited. Retry after {seconds}s"`
      - 400 (date range > 1 month): `"Date range cannot exceed 1 month"`

### Priority 3: MCP Tool

#### P3.1: Create list_recordings tool handler

- [ ] Implement MCP tool for listing recordings
  - **File:** `src/tools/recordings/list.ts`
  - **Refs:** specs/list-recordings.md §4.1
  - **Complexity:** medium
  - **Dependencies:** P2.2
  - **Details:**
    - Export tool definition with name, description, inputSchema
    - Tool name: `list_recordings`
    - Description: `"List Zoom cloud recordings. Defaults to last 7 days."`
    - Input schema: Zod ListRecordingsInput schema
    - Handler function that calls ZoomClient.listRecordings()
    - Transform API response to ListRecordingsOutput

#### P3.2: Create recordings tool index

- [ ] Create barrel export for recording tools
  - **File:** `src/tools/recordings/index.ts`
  - **Refs:** specs/list-recordings.md §3
  - **Complexity:** low
  - **Dependencies:** P3.1
  - **Details:**
    - Export list recordings tool
    - Export get recording tool (placeholder for now)
    - Export combined tools array for MCP server registration

---

## Acceptance Criteria

- [ ] `list_recordings` tool returns recordings from last 7 days by default
- [ ] Custom date ranges work correctly (YYYY-MM-DD format)
- [ ] Pagination works with `next_page_token`
- [ ] Response includes meeting metadata: topic, duration, host_email
- [ ] Error messages are clear and actionable
- [ ] Date validation rejects ranges > 1 month
