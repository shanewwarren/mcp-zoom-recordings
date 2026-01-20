/**
 * Recording type definitions for Zoom cloud recordings
 *
 * Defines types for the list_recordings and get_recording MCP tools.
 */

import { z } from "zod";

/**
 * Input schema for the list_recordings MCP tool.
 */
export const ListRecordingsInputSchema = z.object({
  from: z
    .string()
    .optional()
    .describe("Start date in YYYY-MM-DD format (default: 7 days ago)"),
  to: z
    .string()
    .optional()
    .describe("End date in YYYY-MM-DD format (default: today)"),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(300)
    .optional()
    .default(30)
    .describe("Number of recordings per page (max 300)"),
  next_page_token: z
    .string()
    .optional()
    .describe("Token for fetching next page of results"),
});

/** Input type for the listRecordings client method (before Zod parsing). */
export type ListRecordingsInput = z.input<typeof ListRecordingsInputSchema>;

/**
 * Summary of a meeting with recordings.
 */
export interface RecordingMeeting {
  /** Unique meeting instance ID */
  uuid: string;
  /** Meeting ID (can repeat for recurring meetings) */
  id: number;
  /** Meeting title */
  topic: string;
  /** ISO 8601 timestamp of meeting start */
  start_time: string;
  /** Duration in minutes */
  duration: number;
  /** Total size of all recordings in bytes */
  total_size: number;
  /** Number of recording files */
  recording_count: number;
  /** Email of meeting host */
  host_email: string;
  /** Types of recordings (MP4, M4A, etc.) */
  recording_types: string[];
}

/**
 * Output returned by the list_recordings tool.
 */
export interface ListRecordingsOutput {
  /** Array of meetings with recordings */
  meetings: RecordingMeeting[];
  /** Token for fetching next page (if more results exist) */
  next_page_token?: string;
  /** Total pages available */
  page_count: number;
  /** Total meetings with recordings */
  total_records: number;
}

/**
 * Input schema for the get_recording MCP tool.
 */
export const GetRecordingInputSchema = z.object({
  meeting_id: z
    .string()
    .describe(
      "The meeting UUID or meeting ID. Use the UUID from list_recordings for best results."
    ),
});

/** Input type for the getRecording client method. */
export type GetRecordingInput = z.infer<typeof GetRecordingInputSchema>;

/**
 * File types returned by Zoom recording API.
 */
export type RecordingFileType =
  | "MP4"
  | "M4A"
  | "TRANSCRIPT"
  | "CHAT"
  | "CC"
  | "CSV"
  | "TIMELINE"
  | "SUMMARY";

/**
 * Recording types indicating what kind of recording content.
 */
export type RecordingType =
  | "shared_screen_with_speaker_view"
  | "shared_screen_with_gallery_view"
  | "speaker_view"
  | "gallery_view"
  | "shared_screen"
  | "audio_only"
  | "audio_transcript"
  | "chat_file"
  | "active_speaker"
  | "poll"
  | "timeline"
  | "closed_caption";

/**
 * Details of a single recording file.
 */
export interface RecordingFile {
  /** Unique file ID */
  id: string;
  /** Parent meeting UUID */
  meeting_id: string;
  /** ISO 8601 start time */
  recording_start: string;
  /** ISO 8601 end time */
  recording_end: string;
  /** File type (MP4, M4A, TRANSCRIPT, etc.) */
  file_type: RecordingFileType;
  /** File extension */
  file_extension: string;
  /** Size in bytes */
  file_size: number;
  /** URL to download the file */
  download_url: string;
  /** File processing status */
  status: "completed" | "processing";
  /** What kind of recording content */
  recording_type: RecordingType;
}

/**
 * Output returned by the get_recording tool.
 */
export interface GetRecordingOutput {
  /** Meeting UUID */
  uuid: string;
  /** Meeting ID */
  id: number;
  /** Meeting title */
  topic: string;
  /** ISO 8601 timestamp of meeting start */
  start_time: string;
  /** Duration in minutes */
  duration: number;
  /** Meeting host email */
  host_email: string;
  /** Total size of all recordings in bytes */
  total_size: number;
  /** Array of recording files */
  recording_files: RecordingFile[];
  /** Recording password if protected */
  password?: string;
}
