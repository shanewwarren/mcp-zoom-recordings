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

export type ListRecordingsInput = z.infer<typeof ListRecordingsInputSchema>;

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
