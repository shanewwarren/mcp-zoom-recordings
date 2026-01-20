import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { ZoomClient, ZoomApiError, encodeMeetingId } from "../src/clients/zoom-client";
import type { ZoomAuth } from "../src/auth";

describe("encodeMeetingId", () => {
  test("returns single-encoded ID for normal meeting ID", () => {
    const result = encodeMeetingId("abc123");
    expect(result).toBe("abc123");
  });

  test("double-encodes meeting ID starting with /", () => {
    const result = encodeMeetingId("/abc123");
    expect(result).toBe("%252Fabc123");
  });

  test("double-encodes meeting ID containing //", () => {
    const result = encodeMeetingId("abc//123");
    expect(result).toBe("abc%252F%252F123");
  });

  test("handles special characters in UUID", () => {
    const result = encodeMeetingId("abc+def=ghi");
    expect(result).toBe("abc%2Bdef%3Dghi");
  });
});

describe("ZoomClient", () => {
  const mockAuth = {
    getAccessToken: mock(() => Promise.resolve("mock-token")),
  } as unknown as ZoomAuth;

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    // Reset the mock between tests
    (mockAuth.getAccessToken as ReturnType<typeof mock>).mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("listRecordings", () => {
    const mockListResponse = {
      from: "2026-01-01",
      to: "2026-01-07",
      next_page_token: "",
      page_count: 1,
      page_size: 30,
      total_records: 1,
      meetings: [
        {
          uuid: "meeting-uuid-123",
          id: 12345678901,
          account_id: "account-123",
          host_id: "host-123",
          host_email: "host@example.com",
          topic: "Test Meeting",
          type: 2,
          start_time: "2026-01-05T10:00:00Z",
          timezone: "UTC",
          duration: 60,
          total_size: 1000000,
          recording_count: 2,
          recording_files: [
            { file_type: "MP4" },
            { file_type: "M4A" },
          ],
        },
      ],
    };

    test("fetches recordings with default date range", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockListResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);
      const result = await client.listRecordings();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("https://api.zoom.us/v2/users/me/recordings");
      expect(url).toContain("from=");
      expect(url).toContain("to=");
    });

    test("returns transformed recording data", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockListResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);
      const result = await client.listRecordings();

      expect(result.meetings).toHaveLength(1);
      expect(result.meetings[0].uuid).toBe("meeting-uuid-123");
      expect(result.meetings[0].topic).toBe("Test Meeting");
      expect(result.meetings[0].recording_types).toEqual(["MP4", "M4A"]);
      expect(result.total_records).toBe(1);
    });

    test("includes custom date range in request", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockListResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);
      await client.listRecordings({ from: "2026-01-01", to: "2026-01-31" });

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("from=2026-01-01");
      expect(url).toContain("to=2026-01-31");
    });

    test("includes pagination token when provided", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockListResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);
      await client.listRecordings({ next_page_token: "abc123token" });

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("next_page_token=abc123token");
    });

    test("throws ZoomApiError on 404", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(new Response(null, { status: 404 }))
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);

      await expect(client.listRecordings()).rejects.toThrow(ZoomApiError);
      await expect(client.listRecordings()).rejects.toThrow("not found");
    });

    test("throws ZoomApiError on 429 with retry-after", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(null, {
            status: 429,
            headers: { "Retry-After": "120" },
          })
        )
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);

      try {
        await client.listRecordings();
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ZoomApiError);
        expect((error as ZoomApiError).statusCode).toBe(429);
        expect((error as ZoomApiError).retryAfter).toBe(120);
      }
    });
  });

  describe("getRecording", () => {
    const mockGetResponse = {
      uuid: "meeting-uuid-123",
      id: 12345678901,
      account_id: "account-123",
      host_id: "host-123",
      host_email: "host@example.com",
      topic: "Test Meeting",
      type: 2,
      start_time: "2026-01-05T10:00:00Z",
      duration: 60,
      total_size: 1000000,
      recording_count: 2,
      password: "secret123",
      recording_files: [
        {
          id: "file-1",
          meeting_id: "meeting-uuid-123",
          recording_start: "2026-01-05T10:00:00Z",
          recording_end: "2026-01-05T11:00:00Z",
          file_type: "MP4",
          file_extension: "MP4",
          file_size: 500000,
          status: "completed",
          recording_type: "shared_screen_with_speaker_view",
          download_url: "https://zoom.us/rec/download/file1",
        },
        {
          id: "file-2",
          meeting_id: "meeting-uuid-123",
          recording_start: "2026-01-05T10:00:00Z",
          recording_end: "2026-01-05T11:00:00Z",
          file_type: "M4A",
          file_extension: "M4A",
          file_size: 50000,
          status: "completed",
          recording_type: "audio_only",
          download_url: "https://zoom.us/rec/download/file2",
        },
      ],
    };

    test("fetches recording details with meeting_id", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockGetResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);
      const result = await client.getRecording({ meeting_id: "meeting-uuid-123" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.zoom.us/v2/meetings/meeting-uuid-123/recordings"
      );
    });

    test("returns transformed recording details", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockGetResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);
      const result = await client.getRecording({ meeting_id: "meeting-uuid-123" });

      expect(result.uuid).toBe("meeting-uuid-123");
      expect(result.topic).toBe("Test Meeting");
      expect(result.password).toBe("secret123");
      expect(result.recording_files).toHaveLength(2);
      expect(result.recording_files[0].download_url).toBe(
        "https://zoom.us/rec/download/file1"
      );
    });

    test("double-encodes meeting ID starting with /", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockGetResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);
      await client.getRecording({ meeting_id: "/abc123" });

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("%252Fabc123");
    });

    test("throws ZoomApiError with meeting ID on 404", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(new Response(null, { status: 404 }))
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);

      await expect(
        client.getRecording({ meeting_id: "nonexistent" })
      ).rejects.toThrow("Recording not found for meeting: nonexistent");
    });

    test("throws ZoomApiError on 400 invalid format", async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Invalid meeting ID" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);

      await expect(
        client.getRecording({ meeting_id: "bad-id" })
      ).rejects.toThrow("Invalid meeting ID");
    });
  });

  describe("authentication", () => {
    test("includes Bearer token in request headers", async () => {
      const mockResponse = {
        from: "2026-01-01",
        to: "2026-01-07",
        page_count: 0,
        page_size: 30,
        total_records: 0,
        meetings: [],
      };

      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);
      await client.listRecordings();

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer mock-token"
      );
    });

    test("retries on 401 with fresh token", async () => {
      const mockResponse = {
        from: "2026-01-01",
        to: "2026-01-07",
        page_count: 0,
        page_size: 30,
        total_records: 0,
        meetings: [],
      };

      let callCount = 0;
      const mockFetch = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(new Response(null, { status: 401 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });
      global.fetch = mockFetch;

      const client = new ZoomClient(mockAuth);
      const result = await client.listRecordings();

      // Should have made 2 fetch calls (first failed, second succeeded)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.meetings).toHaveLength(0);
    });
  });
});
