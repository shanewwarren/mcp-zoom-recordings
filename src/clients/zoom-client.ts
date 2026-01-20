/**
 * Zoom API client for cloud recordings
 *
 * Wraps the Zoom REST API with authenticated requests.
 */

import type { ZoomAuth } from "../auth";
import type {
  ListRecordingsInput,
  ListRecordingsOutput,
  RecordingMeeting,
} from "../types/recordings";

const BASE_URL = "https://api.zoom.us/v2";

/**
 * Error thrown when a Zoom API request fails.
 */
export class ZoomApiError extends Error {
  name = "ZoomApiError";

  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryAfter?: number
  ) {
    super(message);
  }
}

/**
 * Client for interacting with the Zoom API.
 *
 * Handles authentication and provides methods for accessing recordings.
 */
export class ZoomClient {
  private auth: ZoomAuth;

  constructor(auth: ZoomAuth) {
    this.auth = auth;
  }

  /**
   * Make an authenticated request to the Zoom API.
   *
   * @param path - API path (without base URL)
   * @param options - Fetch options
   * @returns Response data
   * @throws {ZoomApiError} On API errors
   */
  protected async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.auth.getAccessToken();

    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      // Token might have expired, try refreshing and retrying once
      const newToken = await this.auth.getAccessToken();
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!retryResponse.ok) {
        throw new ZoomApiError(
          "Authentication failed after token refresh",
          retryResponse.status
        );
      }

      return retryResponse.json() as Promise<T>;
    }

    if (response.status === 404) {
      throw new ZoomApiError("Zoom user not found", 404);
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const seconds = retryAfter ? parseInt(retryAfter, 10) : 60;
      throw new ZoomApiError(
        `Rate limited. Retry after ${seconds}s`,
        429,
        seconds
      );
    }

    if (response.status === 400) {
      const body = await response.json().catch(() => ({}));
      const message =
        (body as { message?: string }).message ||
        "Bad request to Zoom API";
      if (message.toLowerCase().includes("date range")) {
        throw new ZoomApiError("Date range cannot exceed 1 month", 400);
      }
      throw new ZoomApiError(message, 400);
    }

    if (!response.ok) {
      throw new ZoomApiError(
        `Zoom API error: HTTP ${response.status}`,
        response.status
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * List cloud recordings for the authenticated user.
   *
   * @param input - Optional filters for date range and pagination
   * @returns List of meetings with recordings
   */
  async listRecordings(
    input: ListRecordingsInput = {}
  ): Promise<ListRecordingsOutput> {
    const params = new URLSearchParams();

    // Set date defaults: from = 7 days ago, to = today
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fromDate = input.from ?? formatDate(sevenDaysAgo);
    const toDate = input.to ?? formatDate(today);

    params.set("from", fromDate);
    params.set("to", toDate);

    if (input.page_size !== undefined) {
      params.set("page_size", String(input.page_size));
    }

    if (input.next_page_token) {
      params.set("next_page_token", input.next_page_token);
    }

    const response = await this.request<ZoomRecordingsApiResponse>(
      `/users/me/recordings?${params.toString()}`
    );

    // Transform API response to our output format
    const meetings: RecordingMeeting[] = response.meetings.map((meeting) => ({
      uuid: meeting.uuid,
      id: meeting.id,
      topic: meeting.topic,
      start_time: meeting.start_time,
      duration: meeting.duration,
      total_size: meeting.total_size,
      recording_count: meeting.recording_count,
      host_email: meeting.host_email,
      recording_types: extractRecordingTypes(meeting.recording_files),
    }));

    return {
      meetings,
      next_page_token: response.next_page_token,
      page_count: response.page_count,
      total_records: response.total_records,
    };
  }
}

/**
 * Format a date as YYYY-MM-DD.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Extract unique recording types from recording files.
 */
function extractRecordingTypes(
  files: ZoomRecordingFile[] | undefined
): string[] {
  if (!files || files.length === 0) {
    return [];
  }
  const types = new Set(files.map((file) => file.file_type));
  return Array.from(types);
}

/**
 * Raw Zoom API response for recordings list.
 */
interface ZoomRecordingsApiResponse {
  from: string;
  to: string;
  next_page_token?: string;
  page_count: number;
  page_size: number;
  total_records: number;
  meetings: ZoomMeetingWithRecordings[];
}

/**
 * Raw meeting data from Zoom API.
 */
interface ZoomMeetingWithRecordings {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  host_email: string;
  topic: string;
  type: number;
  start_time: string;
  timezone: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files?: ZoomRecordingFile[];
}

/**
 * Raw recording file data from Zoom API.
 */
interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_extension: string;
  file_size: number;
  status: string;
  recording_type: string;
}
