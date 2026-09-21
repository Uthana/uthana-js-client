/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { UthanaClient } from "@uthana/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CREATE_TEXT_TO_MOTION_JOB } from "../packages/client/src/graphql";

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

describe("ttm.createJob fast", () => {
  let client: UthanaClient;

  beforeEach(() => {
    vi.resetAllMocks();
    client = new UthanaClient("test-key");
  });

  it("includes fast=true in GraphQL variables", async () => {
    mockGql.mockResolvedValue({
      data: { create_text_to_motion_job: { job: { id: "j1", status: "QUEUED" } } },
    });

    const job = await client.ttm.createJob("wave", {
      model: "text-to-motion-3.0",
      fast: true,
      length: 8,
    });

    expect(job.id).toBe("j1");
    expect(CREATE_TEXT_TO_MOTION_JOB).toContain("$fast: Boolean");
    expect(mockGql).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "wave",
        model: "text-to-motion-3.0",
        fast: true,
        length: 8,
      }),
    );
  });

  it("defaults fast to false", async () => {
    mockGql.mockResolvedValue({
      data: { create_text_to_motion_job: { job: { id: "j2", status: "QUEUED" } } },
    });

    await client.ttm.createJob("dance", { model: "text-to-motion-3.0" });

    expect(mockGql).toHaveBeenCalledWith(expect.objectContaining({ fast: false }));
  });
});

describe("motions loop validation", () => {
  it("rejects invalid trim range", async () => {
    const client = new UthanaClient("test-key");
    await expect(
      client.motions.createLoopedMotion("c1", "m1", { trimStartPct: 0.8, trimEndPct: 0.2 }),
    ).rejects.toThrow(/trimStartPct/);
  });
});
