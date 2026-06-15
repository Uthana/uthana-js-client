/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import {
  LEGACY_MODEL_SHIM,
  TTM_MODELS,
  models,
  normalizeModelName,
} from "../packages/client/src/models.ts";
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

describe("normalizeModelName / LEGACY_MODEL_SHIM", () => {
  it("maps VTM legacy alias to canonical X.Y", () => {
    expect(normalizeModelName("video-to-motion-v2")).toBe("video-to-motion-2.0");
  });

  it("maps vqvae-v1 and its server alias to text-to-motion (current API string)", () => {
    expect(normalizeModelName("vqvae-v1")).toBe("text-to-motion");
    expect(normalizeModelName("text-to-motion")).toBe("text-to-motion");
  });

  it("maps diffusion-v2 and its server alias to text-to-motion-bucmd (current API string)", () => {
    expect(normalizeModelName("diffusion-v2")).toBe("text-to-motion-bucmd");
    expect(normalizeModelName("text-to-motion-bucmd")).toBe("text-to-motion-bucmd");
  });

  it("maps canonical X.Y TTM names down to current API strings", () => {
    expect(normalizeModelName("text-to-motion-1.0")).toBe("text-to-motion");
    expect(normalizeModelName("text-to-motion-2.0")).toBe("text-to-motion-bucmd");
  });

  it("passes through canonical X.Y names unchanged", () => {
    expect(normalizeModelName("video-to-motion-2.0")).toBe("video-to-motion-2.0");
    expect(normalizeModelName("video-to-motion-2.1")).toBe("video-to-motion-2.1");
    expect(normalizeModelName("text-to-motion-3.0")).toBe("text-to-motion-3.0");
  });

  it("passes through unknown strings unchanged", () => {
    expect(normalizeModelName("some-future-model-4.0")).toBe("some-future-model-4.0");
  });

  it("LEGACY_MODEL_SHIM does not contain removed models", () => {
    expect(LEGACY_MODEL_SHIM["flow-matching-v1"]).toBeUndefined();
    expect(LEGACY_MODEL_SHIM["nearest-neighbor-v1"]).toBeUndefined();
  });
});

describe("TTM models", () => {
  it("TTM_MODELS contains canonical X.Y names", () => {
    expect(TTM_MODELS).toContain("text-to-motion-1.0");
    expect(TTM_MODELS).toContain("text-to-motion-2.0");
  });

  it("TTM_MODELS does not contain removed models", () => {
    expect(TTM_MODELS).not.toContain("flow-matching-v1");
    expect(TTM_MODELS).not.toContain("vqvae-v1");
    expect(TTM_MODELS).not.toContain("diffusion-v2");
  });

  it("models.ttm.default is text-to-motion-1.0", () => {
    expect(models.ttm.default).toBe("text-to-motion-1.0");
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

  it("uses text-to-motion for canonical text-to-motion-1.0", () => {
    const result = (
      client as unknown as { _prepareTextToMotion: (o: unknown) => unknown }
    )._prepareTextToMotion({
      model: "text-to-motion-1.0",
      prompt: "walk",
    });
    expect(result).toMatchObject({
      variables: { model: "text-to-motion" },
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

  it("uses text-to-motion-bucmd for canonical text-to-motion-2.0", () => {
    const result = (
      client as unknown as { _prepareTextToMotion: (o: unknown) => unknown }
    )._prepareTextToMotion({
      model: "text-to-motion-2.0",
      prompt: "dance",
    });
    expect(result).toMatchObject({
      variables: { model: "text-to-motion-bucmd" },
    });
  });

  it("uses auto default (text-to-motion) when model is auto", () => {
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
        model: "text-to-motion-bucmd",
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

  it("passes unknown model strings through to the API unchanged", () => {
    const result = (
      client as unknown as { _prepareTextToMotion: (o: unknown) => unknown }
    )._prepareTextToMotion({ model: "some-future-model-4.0", prompt: "x" });
    expect(result).toMatchObject({ variables: { model: "some-future-model-4.0" } });
  });
});
