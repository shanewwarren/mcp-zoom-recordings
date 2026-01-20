# Get Recording Specification

**Status:** Planned
**Version:** 1.0
**Last Updated:** 2025-01-19

---

## 1. Overview

### Purpose

The `get_recording` tool retrieves detailed information about a specific meeting's recordings, including download URLs for each recording file. This is the primary way to obtain URLs for downloading video, audio, transcripts, and other recording artifacts.

### Goals

- **Complete file listing** - Return all recording files for a meeting (video, audio, transcript, chat)
- **Direct download URLs** - Provide URLs that can be fetched to download recording content
- **File metadata** - Include file size, type, and duration for informed selection
- **Transcript access** - Surface transcript files when available

### Non-Goals

- **File downloading** - The tool returns URLs; Claude can fetch them separately
- **Playback URLs** - Focus on download URLs; play_url is for browser playback only
- **Recording deletion** - Read-only access to recordings

---

## 2. Architecture

### Component Structure

```
src/
├── tools/
│   └── recordings/
│       ├── index.ts          # Tool definitions and exports
│       ├── list.ts           # list_recordings implementation
│       └── get.ts            # get_recording implementation
├── clients/
│   └── zoom-client.ts        # Zoom API wrapper
└── types/
    └── recordings.ts         # Recording type definitions
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  get_recording  │────▶│   ZoomClient    │────▶│   Zoom API      │
│      tool       │     │ .getRecording   │     │ /meetings/{id}/ │
└─────────────────┘     └─────────────────┘     │   recordings    │
        │                                        └─────────────────┘
        ▼
┌─────────────────┐
│  MCP Response   │
│  (recording     │
│   details +     │
│   download URLs)│
└─────────────────┘
```

---

## 3. Core Types

### 3.1 GetRecordingInput

Input schema for the MCP tool.

```typescript
const GetRecordingInputSchema = z.object({
  meeting_id: z.string()
    .describe('The meeting UUID or meeting ID. Use the UUID from list_recordings for best results.'),
});

type GetRecordingInput = z.infer<typeof GetRecordingInputSchema>;
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| meeting_id | string | Yes | Meeting UUID (preferred) or numeric meeting ID |

**Note:** Meeting UUIDs that start with `/` or contain `//` must be double-encoded when used in the URL path.

### 3.2 RecordingFile

Details of a single recording file.

```typescript
interface RecordingFile {
  id: string;                    // Unique file ID
  meeting_id: string;            // Parent meeting UUID
  recording_start: string;       // ISO 8601 start time
  recording_end: string;         // ISO 8601 end time
  file_type: RecordingFileType;  // MP4, M4A, TRANSCRIPT, etc.
  file_extension: string;        // File extension (mp4, m4a, vtt)
  file_size: number;             // Size in bytes
  download_url: string;          // URL to download the file
  status: 'completed' | 'processing';
  recording_type: RecordingType; // What kind of recording
}

type RecordingFileType =
  | 'MP4'           // Video file
  | 'M4A'           // Audio only
  | 'TRANSCRIPT'    // VTT transcript
  | 'CHAT'          // Chat log
  | 'CC'            // Closed captions
  | 'CSV'           // Participant list
  | 'TIMELINE'      // Recording timeline
  | 'SUMMARY';      // AI summary (if enabled)

type RecordingType =
  | 'shared_screen_with_speaker_view'
  | 'shared_screen_with_gallery_view'
  | 'speaker_view'
  | 'gallery_view'
  | 'shared_screen'
  | 'audio_only'
  | 'audio_transcript'
  | 'chat_file'
  | 'active_speaker'
  | 'poll'
  | 'timeline'
  | 'closed_caption';
```

### 3.3 GetRecordingOutput

Output returned by the tool.

```typescript
interface GetRecordingOutput {
  uuid: string;                  // Meeting UUID
  id: number;                    // Meeting ID
  topic: string;                 // Meeting title
  start_time: string;            // ISO 8601 timestamp
  duration: number;              // Duration in minutes
  host_email: string;            // Meeting host email
  total_size: number;            // Total size in bytes
  recording_files: RecordingFile[];
  password?: string;             // Recording password if protected
}
```

---

## 4. API / Behaviors

### 4.1 MCP Tool Definition

```typescript
const getRecordingTool = {
  name: 'get_recording',
  description: 'Get detailed information and download URLs for a specific meeting\'s recordings. Use the meeting UUID from list_recordings. Returns all recording files including video, audio, transcripts, and chat logs.',
  inputSchema: {
    type: 'object',
    properties: {
      meeting_id: {
        type: 'string',
        description: 'The meeting UUID (from list_recordings) or meeting ID',
      },
    },
    required: ['meeting_id'],
  },
} as const;
```

### 4.2 Zoom API Call

| Attribute | Value |
|-----------|-------|
| Method | GET |
| Path | `/meetings/{meetingId}/recordings` |
| Auth | Bearer token |

**Path Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| meetingId | Yes | Meeting UUID (double-encode if contains `/`) or meeting ID |

**Response:**

```json
{
  "uuid": "gkABC123==",
  "id": 1234567890,
  "account_id": "xyz789",
  "host_id": "host123",
  "host_email": "user@example.com",
  "topic": "Weekly Team Standup",
  "type": 2,
  "start_time": "2025-01-19T10:00:00Z",
  "duration": 45,
  "total_size": 524288000,
  "recording_count": 4,
  "password": "abc123",
  "recording_files": [
    {
      "id": "file-video-123",
      "meeting_id": "gkABC123==",
      "recording_start": "2025-01-19T10:00:00Z",
      "recording_end": "2025-01-19T10:45:00Z",
      "file_type": "MP4",
      "file_extension": "MP4",
      "file_size": 450000000,
      "play_url": "https://zoom.us/rec/play/...",
      "download_url": "https://zoom.us/rec/download/...",
      "status": "completed",
      "recording_type": "shared_screen_with_speaker_view"
    },
    {
      "id": "file-audio-456",
      "meeting_id": "gkABC123==",
      "recording_start": "2025-01-19T10:00:00Z",
      "recording_end": "2025-01-19T10:45:00Z",
      "file_type": "M4A",
      "file_extension": "M4A",
      "file_size": 45000000,
      "download_url": "https://zoom.us/rec/download/...",
      "status": "completed",
      "recording_type": "audio_only"
    },
    {
      "id": "file-transcript-789",
      "meeting_id": "gkABC123==",
      "recording_start": "2025-01-19T10:00:00Z",
      "recording_end": "2025-01-19T10:45:00Z",
      "file_type": "TRANSCRIPT",
      "file_extension": "VTT",
      "file_size": 25000,
      "download_url": "https://zoom.us/rec/download/...",
      "status": "completed",
      "recording_type": "audio_transcript"
    }
  ]
}
```

### 4.3 Downloading Files

The `download_url` returned requires authentication. To download:

1. Make a GET request to the `download_url`
2. Include `Authorization: Bearer {access_token}` header
3. The response will be the file content

**Important:** Download URLs are temporary and tied to the access token's validity.

### 4.4 Error Handling

| HTTP Code | Scenario | MCP Response |
|-----------|----------|--------------|
| 401 | Invalid/expired token | Re-authenticate and retry once |
| 404 | Meeting/recording not found | Return error: "Recording not found for meeting: {id}" |
| 400 | Invalid meeting ID format | Return error: "Invalid meeting ID format" |
| 429 | Rate limited | Return error with retry-after hint |

### 4.5 UUID Encoding

Meeting UUIDs that begin with `/` or contain `//` must be double-URL-encoded:

```typescript
function encodeMeetingId(meetingId: string): string {
  // Double-encode if UUID contains problematic characters
  if (meetingId.startsWith('/') || meetingId.includes('//')) {
    return encodeURIComponent(encodeURIComponent(meetingId));
  }
  return encodeURIComponent(meetingId);
}
```

---

## 5. Security Considerations

### Download URL Security

- Download URLs require a valid Bearer token
- URLs are not shareable (tied to authentication)
- Consider this when providing URLs to users

### Recording Content

- Recording files may contain sensitive meeting content
- Transcript files contain full meeting dialogue
- Chat logs may contain private messages

---

## 6. Implementation Phases

| Phase | Description | Dependencies | Complexity |
|-------|-------------|--------------|------------|
| 1 | Define types and Zod schemas | None | Low |
| 2 | Implement UUID encoding helper | None | Low |
| 3 | Implement ZoomClient.getRecording | zoom-auth | Medium |
| 4 | Create get_recording tool | Phase 3 | Low |

---

## 7. Example Usage

**Get recording details:**
```
User: "Get the download link for my Weekly Team Standup recording"
Claude: [calls list_recordings to find meeting]
Claude: [calls get_recording with meeting_id="gkABC123=="]
Claude: "Here are the recordings for Weekly Team Standup:
         - Video (MP4): 450MB - shared_screen_with_speaker_view
         - Audio (M4A): 45MB - audio_only
         - Transcript (VTT): 25KB
         Which would you like to download?"
```

**Download a file:**
```
User: "Download the transcript"
Claude: [fetches the download_url with authentication]
Claude: [saves to specified location or provides content]
```
