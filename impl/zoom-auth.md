# Zoom Authentication Implementation

**Spec:** [specs/zoom-auth.md](../specs/zoom-auth.md)
**Status:** Pending
**Last Updated:** 2026-01-20 (P1.1 complete)

---

## Dependencies

- ⏳ project-setup (pending)

---

## Overview

Implement Server-to-Server OAuth 2.0 authentication for Zoom API. This is the foundational auth layer that all other features depend on.

---

## Tasks

### Priority 1: Configuration

#### P1.1: Create ZoomAuthConfig type and loader

- [x] Create config loader with environment variable validation
  - **File:** `src/auth/config.ts`
  - **Refs:** specs/zoom-auth.md §4.1
  - **Complexity:** low
  - **Details:**
    - Define `ZoomAuthConfig` interface: `{ apiKey: string; apiSecret: string; accountId: string }`
    - Implement `loadZoomConfig(): ZoomAuthConfig` function
    - Read from: `ZOOM_API_KEY`, `ZOOM_API_SECRET`, `ZOOM_ACCOUNT_ID`
    - Throw `ZoomAuthError` with clear message if any env var missing
    - Example error: `"Missing required environment variable: ZOOM_API_KEY"`

### Priority 2: Core Authentication

#### P2.1: Create ZoomAuthError class

- [x] Define custom error class for auth-related errors
  - **File:** `src/auth/config.ts` (implemented here since config needs it)
  - **Refs:** specs/zoom-auth.md §4.3
  - **Complexity:** low
  - **Details:**
    - Extend `Error` class
    - Include `name = 'ZoomAuthError'`
  - **Note:** Implemented in config.ts to avoid circular dependency

#### P2.2: Create ZoomAuth class with token fetching

- [ ] Implement core token fetch logic
  - **File:** `src/auth/zoom-auth.ts`
  - **Refs:** specs/zoom-auth.md §4.2
  - **Complexity:** medium
  - **Details:**
    - Constructor accepts `ZoomAuthConfig`
    - Private method `fetchToken(): Promise<ZoomTokenResponse>`
    - Token endpoint: `https://zoom.us/oauth/token`
    - Method: POST
    - Headers:
      - `Authorization: Basic {base64(apiKey:apiSecret)}`
      - `Content-Type: application/x-www-form-urlencoded`
    - Body: `grant_type=account_credentials&account_id={accountId}`
    - Handle errors:
      - 401: `"Invalid credentials (401)"`
      - Network: `"Failed to fetch access token: {message}"`

#### P2.3: Add token caching with expiry buffer

- [ ] Implement token caching to avoid unnecessary requests
  - **File:** `src/auth/zoom-auth.ts`
  - **Refs:** specs/zoom-auth.md §4.2
  - **Complexity:** medium
  - **Dependencies:** P2.2
  - **Details:**
    - Private field `cachedToken: CachedToken | null`
    - `CachedToken` type: `{ accessToken: string; expiresAt: Date }`
    - Public method `getAccessToken(): Promise<string>`
    - Check if cached token exists and is valid (with 5-minute buffer)
    - If valid, return cached token
    - If expired/missing, fetch new token, cache it, return it
    - Expiry buffer: `Date.now() + (expiresIn - 300) * 1000`

#### P2.4: Define ZoomTokenResponse type

- [ ] Create type for Zoom OAuth token response
  - **File:** `src/auth/zoom-auth.ts`
  - **Refs:** specs/zoom-auth.md §4.2
  - **Complexity:** low
  - **Details:**
    ```typescript
    interface ZoomTokenResponse {
      access_token: string;
      token_type: 'bearer';
      expires_in: number; // seconds, typically 3600
      scope: string;
    }
    ```

### Priority 3: Module Exports

#### P3.1: Create auth module index

- [ ] Create barrel export for auth module
  - **File:** `src/auth/index.ts`
  - **Refs:** specs/zoom-auth.md §3
  - **Complexity:** low
  - **Details:**
    - Export `ZoomAuth` class
    - Export `ZoomAuthError` class
    - Export `loadZoomConfig` function
    - Export `ZoomAuthConfig` type

---

## Acceptance Criteria

- [ ] `loadZoomConfig()` throws descriptive error when env vars missing
- [ ] `ZoomAuth.getAccessToken()` returns valid access token
- [ ] Token is cached and reused until near expiry
- [ ] Token is refreshed automatically when expired
- [ ] All errors are wrapped in `ZoomAuthError` with clear messages
- [ ] No credentials are logged or exposed in error messages
