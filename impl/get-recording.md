# Get Recording Implementation

**Spec:** [specs/get-recording.md](../specs/get-recording.md)
**Status:** In Progress
**Last Updated:** 2026-01-20

---

## Dependencies

- ⏳ zoom-auth (pending)
- ⏳ list-recordings (pending) - shares types and ZoomClient

---

## Overview

Implement the `get_recording` MCP tool that retrieves detailed recording information including download URLs for all recording files.

---

## Tasks

### Priority 1: Types and Helpers

#### P1.1: Add RecordingFile types

- [x] Extend type definitions for recording files
  - **File:** `src/types/recordings.ts`
  - **Refs:** specs/get-recording.md §4.2
  - **Complexity:** medium
  - **Details:**
    - `GetRecordingInput` (Zod schema):
      - `meeting_id: string` - Meeting UUID or numeric ID (required)
    - `GetRecordingOutput`:
      - `uuid: string`
      - `id: number`
      - `topic: string`
      - `start_time: string`
      - `duration: number` (minutes)
      - `host_email: string`
      - `total_size: number` (bytes)
      - `password?: string` (if recording is protected)
      - `recording_files: RecordingFile[]`
    - `RecordingFile`:
      - `id: string`
      - `meeting_id: string`
      - `recording_start: string`
      - `recording_end: string`
      - `file_type: RecordingFileType`
      - `file_extension: string`
      - `file_size: number`
      - `download_url: string`
      - `status: string`
      - `recording_type: string`
    - `RecordingFileType` enum/union:
      - `'MP4' | 'M4A' | 'TRANSCRIPT' | 'CHAT' | 'CC' | 'CSV' | 'TIMELINE' | 'SUMMARY'`

#### P1.2: Create UUID encoding helper

- [x] Implement meeting ID encoder for special characters
  - **File:** `src/clients/zoom-client.ts`
  - **Refs:** specs/get-recording.md §4.3
  - **Complexity:** low
  - **Details:**
    - Function: `encodeMeetingId(meetingId: string): string`
    - If meetingId starts with `/` or contains `//`:
      - Return `encodeURIComponent(encodeURIComponent(meetingId))`
    - Otherwise:
      - Return `encodeURIComponent(meetingId)`
    - This handles Zoom's double-encoding requirement for special UUIDs

### Priority 2: Zoom Client Method

#### P2.1: Implement getRecording method

- [ ] Add method to fetch recording details from Zoom API
  - **File:** `src/clients/zoom-client.ts`
  - **Refs:** specs/get-recording.md §4.3
  - **Complexity:** medium
  - **Dependencies:** P1.2
  - **Details:**
    - Endpoint: `GET /meetings/{meetingId}/recordings`
    - Use `encodeMeetingId()` for path parameter
    - Handle errors:
      - 401: Re-fetch token and retry once
      - 404: `"Recording not found for meeting: {id}"`
      - 400: `"Invalid meeting ID format"`
      - 429: `"Rate limited. Retry after {seconds}s"`
    - Return full recording details with files array

### Priority 3: MCP Tool

#### P3.1: Create get_recording tool handler

- [ ] Implement MCP tool for getting recording details
  - **File:** `src/tools/recordings/get.ts`
  - **Refs:** specs/get-recording.md §4.1
  - **Complexity:** medium
  - **Dependencies:** P2.1
  - **Details:**
    - Export tool definition with name, description, inputSchema
    - Tool name: `get_recording`
    - Description: `"Get recording details and download URLs for a specific meeting."`
    - Input schema: Zod GetRecordingInput schema
    - Handler function that calls ZoomClient.getRecording()
    - Transform API response to GetRecordingOutput

---

## Acceptance Criteria

- [ ] `get_recording` tool returns all recording files for a meeting
- [ ] Download URLs are included for each file
- [ ] File metadata includes: type, size, duration, extension
- [ ] UUID encoding works for special characters (/ and //)
- [ ] 404 errors return clear "Recording not found" message
- [ ] Password is included in response when recording is protected
