/**
 * Recording tools barrel export
 *
 * Exports all MCP tools for Zoom cloud recordings.
 */

import { listRecordingsTool, handleListRecordings } from "./list";
import { getRecordingTool, handleGetRecording } from "./get";

export { listRecordingsTool, handleListRecordings };
export { getRecordingTool, handleGetRecording };

/**
 * All recording tools for MCP server registration.
 *
 * Use this array to register all recording-related tools with the MCP server.
 */
export const recordingTools = [listRecordingsTool, getRecordingTool] as const;
