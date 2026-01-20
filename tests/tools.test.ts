import { describe, expect, test, mock } from "bun:test";
import { handleListRecordings, handleGetRecording, recordingTools } from "../src/tools/recordings";
import type { ZoomClient } from "../src/clients/zoom-client";
import type { ListRecordingsOutput, GetRecordingOutput } from "../src/types/recordings";
import { ZodError } from "zod";

describe("recordingTools", () => {
  test("exports list_recordings and get_recording tools", () => {
    expect(recordingTools).toHaveLength(2);
    expect(recordingTools.map((t) => t.name)).toContain("list_recordings");
    expect(recordingTools.map((t) => t.name)).toContain("get_recording");
  });

  test("list_recordings tool has correct schema", () => {
    const listTool = recordingTools.find((t) => t.name === "list_recordings");
    expect(listTool).toBeDefined();
    expect(listTool!.inputSchema.type).toBe("object");
    expect(listTool!.inputSchema.properties).toHaveProperty("from");
    expect(listTool!.inputSchema.properties).toHaveProperty("to");
    expect(listTool!.inputSchema.properties).toHaveProperty("page_size");
    expect(listTool!.inputSchema.properties).toHaveProperty("next_page_token");
  });

  test("get_recording tool has correct schema", () => {
    const getTool = recordingTools.find((t) => t.name === "get_recording");
    expect(getTool).toBeDefined();
    expect(getTool!.inputSchema.type).toBe("object");
    expect(getTool!.inputSchema.properties).toHaveProperty("meeting_id");
    expect(getTool!.inputSchema.required).toContain("meeting_id");
  });
});

describe("handleListRecordings", () => {
  const mockListResponse: ListRecordingsOutput = {
    meetings: [
      {
        uuid: "uuid-123",
        id: 12345678901,
        topic: "Test Meeting",
        start_time: "2026-01-05T10:00:00Z",
        duration: 60,
        total_size: 1000000,
        recording_count: 2,
        host_email: "host@example.com",
        recording_types: ["MP4", "M4A"],
      },
    ],
    next_page_token: undefined,
    page_count: 1,
    total_records: 1,
  };

  test("calls client.listRecordings with parsed input", async () => {
    const mockClient = {
      listRecordings: mock(() => Promise.resolve(mockListResponse)),
    } as unknown as ZoomClient;

    const result = await handleListRecordings(mockClient, {
      from: "2026-01-01",
      to: "2026-01-07",
    });

    expect(mockClient.listRecordings).toHaveBeenCalledTimes(1);
    expect(mockClient.listRecordings).toHaveBeenCalledWith({
      from: "2026-01-01",
      to: "2026-01-07",
      page_size: 30, // default value
    });
    expect(result).toEqual(mockListResponse);
  });

  test("calls client with empty object when no args provided", async () => {
    const mockClient = {
      listRecordings: mock(() => Promise.resolve(mockListResponse)),
    } as unknown as ZoomClient;

    await handleListRecordings(mockClient, {});

    expect(mockClient.listRecordings).toHaveBeenCalledWith({
      page_size: 30, // default value
    });
  });

  test("throws when undefined args provided (Zod requires object)", async () => {
    const mockClient = {
      listRecordings: mock(() => Promise.resolve(mockListResponse)),
    } as unknown as ZoomClient;

    // Zod schema requires an object, so undefined should throw
    await expect(handleListRecordings(mockClient, undefined)).rejects.toThrow();
  });

  test("throws on invalid page_size", async () => {
    const mockClient = {
      listRecordings: mock(() => Promise.resolve(mockListResponse)),
    } as unknown as ZoomClient;

    await expect(
      handleListRecordings(mockClient, { page_size: 500 })
    ).rejects.toThrow();
  });

  test("passes pagination token through", async () => {
    const mockClient = {
      listRecordings: mock(() => Promise.resolve(mockListResponse)),
    } as unknown as ZoomClient;

    await handleListRecordings(mockClient, {
      next_page_token: "abc123",
    });

    expect(mockClient.listRecordings).toHaveBeenCalledWith({
      next_page_token: "abc123",
      page_size: 30,
    });
  });
});

describe("handleGetRecording", () => {
  const mockGetResponse: GetRecordingOutput = {
    uuid: "uuid-123",
    id: 12345678901,
    topic: "Test Meeting",
    start_time: "2026-01-05T10:00:00Z",
    duration: 60,
    host_email: "host@example.com",
    total_size: 1000000,
    recording_files: [
      {
        id: "file-1",
        meeting_id: "uuid-123",
        recording_start: "2026-01-05T10:00:00Z",
        recording_end: "2026-01-05T11:00:00Z",
        file_type: "MP4",
        file_extension: "MP4",
        file_size: 500000,
        download_url: "https://zoom.us/rec/download/file1",
        status: "completed",
        recording_type: "shared_screen_with_speaker_view",
      },
    ],
    password: "secret123",
  };

  test("calls client.getRecording with parsed input", async () => {
    const mockClient = {
      getRecording: mock(() => Promise.resolve(mockGetResponse)),
    } as unknown as ZoomClient;

    const result = await handleGetRecording(mockClient, {
      meeting_id: "uuid-123",
    });

    expect(mockClient.getRecording).toHaveBeenCalledTimes(1);
    expect(mockClient.getRecording).toHaveBeenCalledWith({
      meeting_id: "uuid-123",
    });
    expect(result).toEqual(mockGetResponse);
  });

  test("throws when meeting_id is missing", async () => {
    const mockClient = {
      getRecording: mock(() => Promise.resolve(mockGetResponse)),
    } as unknown as ZoomClient;

    await expect(handleGetRecording(mockClient, {})).rejects.toThrow();
  });

  test("throws when meeting_id is not a string", async () => {
    const mockClient = {
      getRecording: mock(() => Promise.resolve(mockGetResponse)),
    } as unknown as ZoomClient;

    await expect(
      handleGetRecording(mockClient, { meeting_id: 12345 })
    ).rejects.toThrow();
  });

  test("handles special characters in meeting_id", async () => {
    const mockClient = {
      getRecording: mock(() => Promise.resolve(mockGetResponse)),
    } as unknown as ZoomClient;

    await handleGetRecording(mockClient, {
      meeting_id: "/abc//123",
    });

    expect(mockClient.getRecording).toHaveBeenCalledWith({
      meeting_id: "/abc//123",
    });
  });
});
