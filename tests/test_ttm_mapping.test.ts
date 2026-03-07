/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { TTM_MODEL_MAP, TTM_MODELS, models } from "../packages/client/src/models.ts";
import { UthanaClient } from "@uthana/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGql = vi.fn().mockReturnValue({ $send: vi.fn().mockResolvedValue({}) });
const createChain = () => {
  const chain = {
    transport: () => chain,
    use: () => chain,
    gql: mockGql,
  };
  return chain;
};

vi.mock("graffle", () => ({
  Graffle: { create: () => createChain() },
}));

vi.mock("graffle/extensions/upload", () => ({ Upload: {} }));
vi.mock("graffle/extensions/throws", () => ({ Throws: {} }));

describe("TTM_MODEL_MAP", () => {
  it("maps friendly names to server strings", () => {
    expect(TTM_MODEL_MAP["vqvae-v1"]).toBe("text-to-motion");
    expect(TTM_MODEL_MAP["diffusion-v2"]).toBe("text-to-motion-bucmd");
    expect(TTM_MODEL_MAP["flow-matching-v1"]).toBe("flow-matching-v1");
  });

  it("accepts server aliases as identity", () => {
    expect(TTM_MODEL_MAP["text-to-motion"]).toBe("text-to-motion");
    expect(TTM_MODEL_MAP["text-to-motion-bucmd"]).toBe("text-to-motion-bucmd");
  });
});

describe("TTM models", () => {
  it("TTM_MODELS includes all public models", () => {
    expect(TTM_MODELS).toContain("vqvae-v1");
    expect(TTM_MODELS).toContain("diffusion-v2");
    expect(TTM_MODELS).toContain("flow-matching-v1");
  });

  it("models.ttm.default is vqvae-v1", () => {
    expect(models.ttm.default).toBe("vqvae-v1");
  });
});

describe("_prepareTextToMotion", () => {
  let client: UthanaClient;

  beforeEach(() => {
    client = new UthanaClient("test-key");
  });

  it("uses text-to-motion for vqvae-v1", () => {
    const result = (
      client as unknown as { _prepareTextToMotion: (o: unknown) => unknown }
    )._prepareTextToMotion({
      model: "vqvae-v1",
      prompt: "walk",
    });
    expect(result).toMatchObject({
      variables: {
        prompt: "walk",
        model: "text-to-motion",
      },
    });
  });

  it("uses text-to-motion-bucmd for diffusion-v2", () => {
    const result = (
      client as unknown as { _prepareTextToMotion: (o: unknown) => unknown }
    )._prepareTextToMotion({
      model: "diffusion-v2",
      prompt: "dance",
      cfg_scale: 2.5,
      internal_ik: true,
    });
    expect(result).toMatchObject({
      variables: {
        prompt: "dance",
        model: "text-to-motion-bucmd",
        cfg_scale: 2.5,
        retargeting_ik: true,
      },
    });
  });

  it("uses auto default when model is auto", () => {
    const result = (
      client as unknown as { _prepareTextToMotion: (o: unknown) => unknown }
    )._prepareTextToMotion({
      model: "auto",
      prompt: "wave",
    });
    expect(result).toMatchObject({
      variables: { model: "text-to-motion" },
    });
  });

  it("passes all optional params", () => {
    const result = (
      client as unknown as { _prepareTextToMotion: (o: unknown) => unknown }
    )._prepareTextToMotion({
      model: "diffusion-v2",
      prompt: "run",
      character_id: "cid",
      foot_ik: true,
      enhance_prompt: true,
      steps: 50,
      length: 5.0,
      cfg_scale: 2.0,
      seed: 42,
      internal_ik: true,
    });
    expect(result).toMatchObject({
      variables: {
        prompt: "run",
        character_id: "cid",
        foot_ik: true,
        enhance_prompt: true,
        steps: 50,
        length: 5.0,
        cfg_scale: 2.0,
        seed: 42,
        retargeting_ik: true,
      },
    });
  });

  it("throws for unknown model", () => {
    expect(() =>
      (client as unknown as { _prepareTextToMotion: (o: unknown) => unknown })._prepareTextToMotion(
        { model: "unknown-model", prompt: "x" },
      ),
    ).toThrow("Unknown model");
  });
});
