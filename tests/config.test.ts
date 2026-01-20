import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { loadZoomConfig, ZoomAuthError } from "../src/auth/config";

describe("loadZoomConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ZOOM_API_KEY;
    delete process.env.ZOOM_API_SECRET;
    delete process.env.ZOOM_ACCOUNT_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("returns config when all env vars are present", () => {
    process.env.ZOOM_API_KEY = "test-api-key";
    process.env.ZOOM_API_SECRET = "test-api-secret";
    process.env.ZOOM_ACCOUNT_ID = "test-account-id";

    const config = loadZoomConfig();

    expect(config).toEqual({
      apiKey: "test-api-key",
      apiSecret: "test-api-secret",
      accountId: "test-account-id",
    });
  });

  test("throws ZoomAuthError when ZOOM_API_KEY is missing", () => {
    process.env.ZOOM_API_SECRET = "test-api-secret";
    process.env.ZOOM_ACCOUNT_ID = "test-account-id";

    expect(() => loadZoomConfig()).toThrow(ZoomAuthError);
    expect(() => loadZoomConfig()).toThrow(
      "Missing required environment variable: ZOOM_API_KEY"
    );
  });

  test("throws ZoomAuthError when ZOOM_API_SECRET is missing", () => {
    process.env.ZOOM_API_KEY = "test-api-key";
    process.env.ZOOM_ACCOUNT_ID = "test-account-id";

    expect(() => loadZoomConfig()).toThrow(ZoomAuthError);
    expect(() => loadZoomConfig()).toThrow(
      "Missing required environment variable: ZOOM_API_SECRET"
    );
  });

  test("throws ZoomAuthError when ZOOM_ACCOUNT_ID is missing", () => {
    process.env.ZOOM_API_KEY = "test-api-key";
    process.env.ZOOM_API_SECRET = "test-api-secret";

    expect(() => loadZoomConfig()).toThrow(ZoomAuthError);
    expect(() => loadZoomConfig()).toThrow(
      "Missing required environment variable: ZOOM_ACCOUNT_ID"
    );
  });
});

describe("ZoomAuthError", () => {
  test("has correct name property", () => {
    const error = new ZoomAuthError("test message");
    expect(error.name).toBe("ZoomAuthError");
  });

  test("has correct message", () => {
    const error = new ZoomAuthError("test message");
    expect(error.message).toBe("test message");
  });

  test("is an instance of Error", () => {
    const error = new ZoomAuthError("test message");
    expect(error).toBeInstanceOf(Error);
  });
});
