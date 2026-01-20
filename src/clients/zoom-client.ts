/**
 * Zoom API client for cloud recordings
 *
 * Wraps the Zoom REST API with authenticated requests.
 */

import type { ZoomAuth } from "../auth";

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
}
