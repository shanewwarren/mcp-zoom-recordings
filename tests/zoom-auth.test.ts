import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { ZoomAuth, ZoomAuthError } from "../src/auth";

describe("ZoomAuth", () => {
  const mockConfig = {
    apiKey: "test-api-key",
    apiSecret: "test-api-secret",
    accountId: "test-account-id",
  };

  const mockTokenResponse = {
    access_token: "mock-access-token",
    token_type: "bearer" as const,
    expires_in: 3600,
    scope: "recording:read:admin",
  };

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("getAccessToken fetches and returns new token", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockTokenResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    global.fetch = mockFetch;

    const auth = new ZoomAuth(mockConfig);
    const token = await auth.getAccessToken();

    expect(token).toBe("mock-access-token");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("getAccessToken caches token and returns cached value", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockTokenResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    global.fetch = mockFetch;

    const auth = new ZoomAuth(mockConfig);

    // First call - should fetch
    const token1 = await auth.getAccessToken();
    // Second call - should use cache
    const token2 = await auth.getAccessToken();

    expect(token1).toBe("mock-access-token");
    expect(token2).toBe("mock-access-token");
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only one fetch call
  });

  test("getAccessToken sends correct auth header", async () => {
    let capturedHeaders: Headers | undefined;
    const mockFetch = mock((url: string, options: RequestInit) => {
      capturedHeaders = options.headers as Headers;
      return Promise.resolve(
        new Response(JSON.stringify(mockTokenResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });
    global.fetch = mockFetch;

    const auth = new ZoomAuth(mockConfig);
    await auth.getAccessToken();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://zoom.us/oauth/token");
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );

    // Verify Basic auth header
    const expectedCredentials = Buffer.from(
      `${mockConfig.apiKey}:${mockConfig.apiSecret}`
    ).toString("base64");
    expect(
      (options.headers as Record<string, string>)["Authorization"]
    ).toBe(`Basic ${expectedCredentials}`);
  });

  test("getAccessToken sends correct body with account_id", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockTokenResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    global.fetch = mockFetch;

    const auth = new ZoomAuth(mockConfig);
    await auth.getAccessToken();

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBe(
      `grant_type=account_credentials&account_id=${mockConfig.accountId}`
    );
  });

  test("getAccessToken throws ZoomAuthError on 401", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(new Response(null, { status: 401 }))
    );
    global.fetch = mockFetch;

    const auth = new ZoomAuth(mockConfig);

    await expect(auth.getAccessToken()).rejects.toThrow(ZoomAuthError);
    await expect(auth.getAccessToken()).rejects.toThrow("Invalid credentials");
  });

  test("getAccessToken throws ZoomAuthError on non-ok response", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(new Response(null, { status: 500 }))
    );
    global.fetch = mockFetch;

    const auth = new ZoomAuth(mockConfig);

    await expect(auth.getAccessToken()).rejects.toThrow(ZoomAuthError);
    await expect(auth.getAccessToken()).rejects.toThrow("HTTP 500");
  });

  test("getAccessToken throws ZoomAuthError on network error", async () => {
    const mockFetch = mock(() => Promise.reject(new Error("Network error")));
    global.fetch = mockFetch;

    const auth = new ZoomAuth(mockConfig);

    await expect(auth.getAccessToken()).rejects.toThrow(ZoomAuthError);
    await expect(auth.getAccessToken()).rejects.toThrow("Network error");
  });
});
