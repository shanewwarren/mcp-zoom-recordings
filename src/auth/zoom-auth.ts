/**
 * Zoom Server-to-Server OAuth token management
 *
 * Handles fetching and caching access tokens for Zoom API requests.
 */

import { type ZoomAuthConfig, ZoomAuthError } from "./config";

/**
 * Response from the Zoom OAuth token endpoint.
 */
interface ZoomTokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number; // seconds until expiry (typically 3600)
  scope: string; // space-separated scopes
}

/**
 * Cached token with expiry information.
 */
interface CachedToken {
  accessToken: string;
  expiresAt: Date;
}

const TOKEN_ENDPOINT = "https://zoom.us/oauth/token";
const EXPIRY_BUFFER_SECONDS = 300; // 5 minutes

/**
 * Manages Zoom Server-to-Server OAuth authentication.
 *
 * Handles token fetching and caching with automatic refresh.
 */
export class ZoomAuth {
  private config: ZoomAuthConfig;
  private cachedToken: CachedToken | null = null;

  constructor(config: ZoomAuthConfig) {
    this.config = config;
  }

  /**
   * Get a valid access token, fetching a new one if needed.
   *
   * Tokens are cached and reused until they are within 5 minutes of expiry.
   *
   * @returns A valid access token string
   * @throws {ZoomAuthError} If token fetch fails
   */
  async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      return this.cachedToken.accessToken;
    }

    const tokenResponse = await this.fetchToken();

    // Cache the token with expiry buffer
    const expiresAt = new Date(
      Date.now() + (tokenResponse.expires_in - EXPIRY_BUFFER_SECONDS) * 1000
    );

    this.cachedToken = {
      accessToken: tokenResponse.access_token,
      expiresAt,
    };

    return this.cachedToken.accessToken;
  }

  /**
   * Check if a cached token is still valid (not expired).
   */
  private isTokenValid(token: CachedToken): boolean {
    return token.expiresAt > new Date();
  }

  /**
   * Fetch a new access token from Zoom's OAuth endpoint.
   *
   * @returns Token response from Zoom
   * @throws {ZoomAuthError} On network errors or invalid credentials
   */
  private async fetchToken(): Promise<ZoomTokenResponse> {
    const credentials = Buffer.from(
      `${this.config.apiKey}:${this.config.apiSecret}`
    ).toString("base64");

    let response: Response;
    try {
      response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=account_credentials&account_id=${this.config.accountId}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ZoomAuthError(`Failed to fetch access token: ${message}`);
    }

    if (response.status === 401) {
      throw new ZoomAuthError("Invalid credentials (401)");
    }

    if (!response.ok) {
      throw new ZoomAuthError(
        `Failed to fetch access token: HTTP ${response.status}`
      );
    }

    return response.json() as Promise<ZoomTokenResponse>;
  }
}
