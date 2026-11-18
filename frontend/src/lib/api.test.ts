import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getApiBaseUrl,
  setApiBaseUrl,
  getApiKey,
  setApiKey,
  askQuestion,
  checkHealth,
  ApiError,
} from "./api";

const DEFAULT_BASE_URL = "http://localhost:8000";

describe("backend address and API key persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to the default backend address when nothing is saved", () => {
    expect(getApiBaseUrl()).toBe(DEFAULT_BASE_URL);
  });

  it("round-trips a saved backend address through localStorage", () => {
    setApiBaseUrl("http://1.2.3.4:8000");
    expect(getApiBaseUrl()).toBe("http://1.2.3.4:8000");
  });

  it("falls back to an empty API key when nothing is saved", () => {
    expect(getApiKey()).toBe("");
  });

  it("round-trips a saved API key through localStorage", () => {
    setApiKey("secret-123");
    expect(getApiKey()).toBe("secret-123");
  });
});

describe("askQuestion", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.localStorage.clear();
  });

  it("sends the question and returns the parsed answer on success", async () => {
    const fakeAnswer = { answer: "42", citations: [] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeAnswer,
    }) as unknown as typeof fetch;

    const result = await askQuestion("What is the answer?", DEFAULT_BASE_URL);

    expect(result).toEqual(fakeAnswer);
    expect(global.fetch).toHaveBeenCalledWith(
      `${DEFAULT_BASE_URL}/ask`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("attaches the X-API-Key header only when a key is saved", async () => {
    setApiKey("my-key");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ answer: "ok" }),
    }) as unknown as typeof fetch;

    await askQuestion("hi", DEFAULT_BASE_URL);

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers["X-API-Key"]).toBe("my-key");
  });

  it("throws a clear ApiError when the backend rejects the API key (401)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as unknown as typeof fetch;

    await expect(askQuestion("hi", DEFAULT_BASE_URL)).rejects.toThrow(ApiError);
  });

  it("throws a clear ApiError when the backend is unreachable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("network error"));

    await expect(askQuestion("hi", DEFAULT_BASE_URL)).rejects.toThrow(/Couldn't reach the backend/);
  });

  it("throws a clear ApiError with the response body on a non-2xx status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "internal error",
    }) as unknown as typeof fetch;

    await expect(askQuestion("hi", DEFAULT_BASE_URL)).rejects.toThrow(/500/);
  });
});

describe("checkHealth", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns true when the backend responds ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    expect(await checkHealth(DEFAULT_BASE_URL)).toBe(true);
  });

  it("returns false when the backend responds with an error status", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    expect(await checkHealth(DEFAULT_BASE_URL)).toBe(false);
  });

  it("returns false (never throws) when the backend is unreachable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("network error"));
    expect(await checkHealth(DEFAULT_BASE_URL)).toBe(false);
  });
});
