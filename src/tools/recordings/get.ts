/**
 * get_recording MCP tool handler
 *
 * Gets detailed recording information and download URLs for a specific meeting.
 */

import type { ZoomClient } from "../../clients/zoom-client";
import {
  GetRecordingInputSchema,
  type GetRecordingOutput,
} from "../../types/recordings";

/**
 * MCP tool definition for get_recording.
 */
export const getRecordingTool = {
  name: "get_recording",
  description:
    "Get detailed information and download URLs for a specific meeting's recordings. Use the meeting UUID from list_recordings. Returns all recording files including video, audio, transcripts, and chat logs.",
  inputSchema: {
    type: "object",
    properties: {
      meeting_id: {
        type: "string",
        description: "The meeting UUID (from list_recordings) or meeting ID",
      },
    },
    required: ["meeting_id"],
  },
} as const;

/**
 * Handle a get_recording tool call.
 *
 * @param client - The authenticated ZoomClient instance
 * @param args - Raw arguments from the MCP tool call
 * @returns Recording details including download URLs for all files
 */
export async function handleGetRecording(
  client: ZoomClient,
  args: unknown
): Promise<GetRecordingOutput> {
  const input = GetRecordingInputSchema.parse(args);
  return client.getRecording(input);
}
