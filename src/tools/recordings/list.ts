/**
 * list_recordings MCP tool handler
 *
 * Lists Zoom cloud recordings with optional date filtering.
 * Defaults to last 7 days when no date range specified.
 */

import type { ZoomClient } from "../../clients/zoom-client";
import {
  ListRecordingsInputSchema,
  type ListRecordingsOutput,
} from "../../types/recordings";

/**
 * MCP tool definition for list_recordings.
 */
export const listRecordingsTool = {
  name: "list_recordings",
  description:
    "List Zoom cloud recordings for the authenticated account. Returns meeting summaries with recording counts. Use get_recording with a meeting UUID to get download URLs.",
  inputSchema: {
    type: "object",
    properties: {
      from: {
        type: "string",
        description: "Start date in YYYY-MM-DD format (default: 7 days ago)",
      },
      to: {
        type: "string",
        description: "End date in YYYY-MM-DD format (default: today)",
      },
      page_size: {
        type: "number",
        description: "Number of recordings per page (1-300, default: 30)",
      },
      next_page_token: {
        type: "string",
        description: "Token for fetching next page of results",
      },
    },
  },
} as const;

/**
 * Handle a list_recordings tool call.
 *
 * @param client - The authenticated ZoomClient instance
 * @param args - Raw arguments from the MCP tool call
 * @returns List of meetings with recordings
 */
export async function handleListRecordings(
  client: ZoomClient,
  args: unknown
): Promise<ListRecordingsOutput> {
  const input = ListRecordingsInputSchema.parse(args);
  return client.listRecordings(input);
}
