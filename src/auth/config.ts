/**
 * Zoom authentication configuration loader
 *
 * Loads and validates Server-to-Server OAuth credentials from environment variables.
 */

/**
 * Configuration for Zoom Server-to-Server OAuth authentication.
 */
export interface ZoomAuthConfig {
  /** Zoom Server-to-Server app Client ID (ZOOM_API_KEY) */
  apiKey: string;
  /** Zoom Server-to-Server app Client Secret (ZOOM_API_SECRET) */
  apiSecret: string;
  /** Zoom Account ID (ZOOM_ACCOUNT_ID) */
  accountId: string;
}

/**
 * Error thrown when authentication configuration is invalid.
 */
export class ZoomAuthError extends Error {
  name = "ZoomAuthError";
}

/**
 * Load Zoom authentication configuration from environment variables.
 *
 * Required environment variables:
 * - ZOOM_API_KEY: Server-to-Server OAuth Client ID
 * - ZOOM_API_SECRET: Server-to-Server OAuth Client Secret
 * - ZOOM_ACCOUNT_ID: Zoom Account ID
 *
 * @returns Validated configuration object
 * @throws {ZoomAuthError} If any required environment variable is missing
 */
export function loadZoomConfig(): ZoomAuthConfig {
  const apiKey = process.env.ZOOM_API_KEY;
  const apiSecret = process.env.ZOOM_API_SECRET;
  const accountId = process.env.ZOOM_ACCOUNT_ID;

  if (!apiKey) {
    throw new ZoomAuthError(
      "Missing required environment variable: ZOOM_API_KEY"
    );
  }

  if (!apiSecret) {
    throw new ZoomAuthError(
      "Missing required environment variable: ZOOM_API_SECRET"
    );
  }

  if (!accountId) {
    throw new ZoomAuthError(
      "Missing required environment variable: ZOOM_ACCOUNT_ID"
    );
  }

  return {
    apiKey,
    apiSecret,
    accountId,
  };
}
