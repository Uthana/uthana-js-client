/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { UthanaClient, UthanaError } from "@uthana/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGql = vi.fn();
const createChain = () => {
  const chain = {
    transport: () => chain,
    use: () => chain,
    gql: () => ({ $send: mockGql }),
  };
  return chain;
};

vi.mock("graffle", () => ({
  Graffle: { create: () => createChain() },
}));

vi.mock("graffle/extensions/throws", () => ({ Throws: {} }));

describe("jobs.wait", () => {
  let client: UthanaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new UthanaClient("test-key");
  });

  it("returns immediately when job is FINISHED", async () => {
    mockGql.mockResolvedValue({
      data: {
        job: { id: "j1", status: "FINISHED", result: { motion_id: "m1" } },
      },
    });

    const result = await client.jobs.wait("j1", { intervalMs: 100, timeoutMs: 5000 });
    expect(result.status).toBe("FINISHED");
    expect(mockGql).toHaveBeenCalledTimes(1);
  });

  it("polls until FINISHED", async () => {
    mockGql
      .mockResolvedValueOnce({
        data: { job: { id: "j1", status: "RESERVED" } },
      })
      .mockResolvedValueOnce({
        data: { job: { id: "j1", status: "READY" } },
      })
      .mockResolvedValueOnce({
        data: { job: { id: "j1", status: "FINISHED", result: {} } },
      });

    const result = await client.jobs.wait("j1", { intervalMs: 10, timeoutMs: 5000 });
    expect(result.status).toBe("FINISHED");
    expect(mockGql).toHaveBeenCalledTimes(3);
  });

  it("throws UthanaError when job FAILED", async () => {
    mockGql.mockResolvedValue({
      data: {
        job: {
          id: "j1",
          status: "FAILED",
          result: { message: "Processing error" },
        },
      },
    });

    await expect(client.jobs.wait("j1", { intervalMs: 10, timeoutMs: 5000 })).rejects.toThrow(
      UthanaError,
    );
    await expect(client.jobs.wait("j1", { intervalMs: 10, timeoutMs: 5000 })).rejects.toThrow(
      "Processing error",
    );
  });

  it("throws UthanaError on timeout", async () => {
    mockGql.mockResolvedValue({
      data: { job: { id: "j1", status: "RESERVED" } },
    });

    await expect(client.jobs.wait("j1", { intervalMs: 20, timeoutMs: 50 })).rejects.toThrow(
      UthanaError,
    );
    await expect(client.jobs.wait("j1", { intervalMs: 20, timeoutMs: 50 })).rejects.toThrow(
      "did not finish within",
    );
  });
});

it.each([0, -1, NaN, Infinity, true, null, 2147483648])(
  "rejects invalid polling timing %s before transport",
  async (value) => {
    const client = new UthanaClient("test");
    mockGql.mockClear();
    // @ts-expect-error Runtime validation.
    await expect(client.jobs.wait("j1", { intervalMs: value })).rejects.toThrow("intervalMs");
    // @ts-expect-error Runtime validation.
    await expect(client.jobs.wait("j1", { timeoutMs: value })).rejects.toThrow("timeoutMs");
    expect(mockGql).not.toHaveBeenCalled();
  },
);
it("stops waiting for a slow request at the polling deadline", async () => {
  mockGql.mockReset().mockImplementation(() => new Promise(() => {}));
  await expect(new UthanaClient("test").jobs.wait("j1", { timeoutMs: 20 })).rejects.toMatchObject({
    statusCode: 408,
  });
  expect(mockGql).toHaveBeenCalledTimes(1);
});
it.each([
  [{}, 404],
  [{ id: "j1" }, 502],
  [{ id: "j1", status: " " }, 502],
  [{ status: 0 }, 502],
])("rejects missing jobs or malformed status", async (job, statusCode) => {
  mockGql.mockReset().mockResolvedValue({ data: { job } });
  await expect(new UthanaClient("test").jobs.wait("j1")).rejects.toMatchObject({ statusCode });
  expect(mockGql).toHaveBeenCalledTimes(1);
});
it("preserves a lookup failure without retrying", async () => {
  const error = new Error("lookup failed");
  mockGql.mockReset().mockRejectedValue(error);
  await expect(new UthanaClient("test").jobs.wait("j1")).rejects.toBe(error);
  expect(mockGql).toHaveBeenCalledTimes(1);
});

it("gives the polling deadline precedence over an equal request timeout", async () => {
  const client = new UthanaClient("test", { timeout: 0.02 });
  vi.spyOn(client.jobs, "get").mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        setTimeout(() => reject(new DOMException("Request timed out", "TimeoutError")), 20);
      }),
  );
  await expect(client.jobs.wait("j1")).rejects.toMatchObject({ statusCode: 408 });
});
it.each(["Actionable failure", { code: "invalid_motion", detail: "No usable frames" }])(
  "preserves job failure diagnostics: %s",
  async (result) => {
    mockGql
      .mockReset()
      .mockResolvedValue({ data: { job: { id: "j1", status: "FAILED", result } } });
    await expect(new UthanaClient("test").jobs.wait("j1")).rejects.toMatchObject({
      statusCode: 500,
      apiMessage: typeof result === "string" ? result : JSON.stringify(result),
    });
    expect(mockGql).toHaveBeenCalledTimes(1);
  },
);
