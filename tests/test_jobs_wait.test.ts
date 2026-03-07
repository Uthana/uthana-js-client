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

vi.mock("graffle/extensions/upload", () => ({ Upload: {} }));
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
