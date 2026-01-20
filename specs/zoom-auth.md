# Zoom Authentication Specification

**Status:** Planned
**Version:** 1.0
**Last Updated:** 2025-01-19

---

## 1. Overview

### Purpose

The authentication module handles Server-to-Server OAuth 2.0 authentication with the Zoom API. Unlike the Google MCPs which use user-delegated OAuth with browser flows, this MCP uses machine-to-machine authentication with API credentials, eliminating the need for user interaction.

### Goals

- **Simple configuration** - Only require three environment variables for setup
- **Automatic token management** - Handle token caching and refresh transparently
- **Fail-fast errors** - Provide clear error messages when credentials are invalid or missing

### Non-Goals

- **User OAuth flows** - No browser-based authentication; this is service-account only
- **Multiple accounts** - Single Zoom account per MCP instance
- **Token persistence** - Tokens are cached in memory only (they expire in 1 hour anyway)

---

## 2. Architecture

### Component Structure

```
src/
├── auth/
│   ├── index.ts              # Re-exports
│   ├── zoom-auth.ts          # ZoomAuth class with token management
│   └── config.ts             # Environment variable loading and validation
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Tool      │────▶│   ZoomClient    │────▶│   ZoomAuth      │
│ (list_recordings)│     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Zoom OAuth API │
                                               │ zoom.us/oauth   │
                                               └─────────────────┘
```

1. Tool calls ZoomClient method
2. ZoomClient requests access token from ZoomAuth
3. ZoomAuth returns cached token or fetches new one
4. ZoomClient makes authenticated API request

---

## 3. Core Types

### 3.1 ZoomAuthConfig

Configuration loaded from environment variables.

```typescript
interface ZoomAuthConfig {
  apiKey: string;      // ZOOM_API_KEY (Client ID)
  apiSecret: string;   // ZOOM_API_SECRET (Client Secret)
  accountId: string;   // ZOOM_ACCOUNT_ID
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| apiKey | string | Yes | Zoom Server-to-Server app Client ID |
| apiSecret | string | Yes | Zoom Server-to-Server app Client Secret |
| accountId | string | Yes | Zoom Account ID for the workspace |

### 3.2 ZoomTokenResponse

Response from the Zoom OAuth token endpoint.

```typescript
interface ZoomTokenResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;  // seconds until expiry (typically 3600)
  scope: string;       // space-separated scopes
}
```

### 3.3 CachedToken

Internal representation of a cached access token.

```typescript
interface CachedToken {
  accessToken: string;
  expiresAt: Date;     // When this token expires
}
```

---

## 4. API / Behaviors

### 4.1 Get Access Token

**Purpose:** Retrieve a valid access token, fetching a new one if needed.

```typescript
class ZoomAuth {
  async getAccessToken(): Promise<string>
}
```

**Behavior:**

1. Check if cached token exists and is valid (with 5-minute buffer)
2. If valid, return cached token
3. If expired/missing, request new token from Zoom
4. Cache new token and return it

**Token Request:**

| Attribute | Value |
|-----------|-------|
| Method | POST |
| URL | `https://zoom.us/oauth/token` |
| Content-Type | `application/x-www-form-urlencoded` |
| Authorization | `Basic {base64(apiKey:apiSecret)}` |

**Request Body:**

```
grant_type=account_credentials&account_id={accountId}
```

**Errors:**

| Scenario | Error |
|----------|-------|
| Missing env vars | `ZoomAuthError: Missing required environment variable: ZOOM_API_KEY` |
| Invalid credentials | `ZoomAuthError: Invalid credentials (401)` |
| Network failure | `ZoomAuthError: Failed to fetch access token: {message}` |

### 4.2 Validate Config

**Purpose:** Ensure all required environment variables are present.

```typescript
function loadZoomConfig(): ZoomAuthConfig
```

**Behavior:**

1. Read `ZOOM_API_KEY`, `ZOOM_API_SECRET`, `ZOOM_ACCOUNT_ID` from environment
2. Throw descriptive error if any are missing
3. Return validated config object

---

## 5. Configuration

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `ZOOM_API_KEY` | string | Server-to-Server OAuth Client ID | (required) |
| `ZOOM_API_SECRET` | string | Server-to-Server OAuth Client Secret | (required) |
| `ZOOM_ACCOUNT_ID` | string | Zoom Account ID | (required) |

### Obtaining Credentials

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click "Develop" → "Build App"
3. Choose "Server-to-Server OAuth" app type
4. Note the Client ID, Client Secret, and Account ID
5. Add scopes: `cloud_recording:read:list_user_recordings:admin`, `cloud_recording:read:list_recording_files:admin`

---

## 6. Security Considerations

### Credential Storage

- Credentials are read from environment variables only
- Never log or expose credentials in error messages
- The API secret should be treated as a password

### Token Handling

- Access tokens are cached in memory only (not persisted)
- Tokens automatically refresh before expiry (5-minute buffer)
- Tokens are short-lived (1 hour) limiting exposure if leaked

### Network Security

- All requests use HTTPS
- Basic auth credentials are base64-encoded (standard OAuth practice)

---

## 7. Implementation Phases

| Phase | Description | Dependencies | Complexity |
|-------|-------------|--------------|------------|
| 1 | Create config.ts with env validation | None | Low |
| 2 | Create ZoomAuth class with token fetching | Phase 1 | Medium |
| 3 | Add token caching with expiry buffer | Phase 2 | Low |

---

## 8. Reference Implementation

Based on [echelon-ai-labs/zoom-mcp](https://github.com/echelon-ai-labs/zoom-mcp/blob/main/src/zoom_mcp/auth/zoom_auth.py):

```typescript
// Simplified example of the token fetch logic
async function fetchAccessToken(config: ZoomAuthConfig): Promise<ZoomTokenResponse> {
  const credentials = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=account_credentials&account_id=${config.accountId}`,
  });

  if (!response.ok) {
    throw new ZoomAuthError(`Failed to fetch token: ${response.status}`);
  }

  return response.json();
}
```
