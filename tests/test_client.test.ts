/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 *
 * Integration tests against the real Uthana API.
 *
 * Required env:
 *   UTHANA_API_KEY   — skips entire suite when absent or set to "xxx"
 *   UTHANA_DOMAIN    — optional custom domain (defaults to uthana.com)
 *
 * Optional env:
 *   UTHANA_LONG_TESTS=true — enables long-running tests (vtm, character
 *                            generation from text). These are skipped by
 *                            default due to their runtime (up to 5 min).
 */

import { resolve } from "node:path";
import { UthanaClient, UthanaCharacters } from "@uthana/client";
import { beforeAll, describe, expect, it } from "vitest";

const FIXTURES_DIR = resolve(import.meta.dirname, "fixtures");

const API_KEY = process.env.UTHANA_API_KEY;
const DOMAIN = process.env.UTHANA_DOMAIN;

const shouldRun = !!API_KEY && API_KEY !== "xxx";
const shouldRunLong = shouldRun && process.env.UTHANA_LONG_TESTS === "true";

describe.skipIf(!shouldRun)("UthanaClient integration", () => {
  let client: UthanaClient;

  beforeAll(() => {
    client = new UthanaClient(API_KEY!, {
      domain: DOMAIN ?? undefined,
    });
  });

  it("org.getUser returns user", async () => {
    const user = await client.org.getUser();
    expect(user).toBeDefined();
    expect(typeof user?.id).toBe("string");
  });

  it("org.getOrg returns org", async () => {
    const org = await client.org.getOrg();
    expect(org).toBeDefined();
    expect(typeof org?.id).toBe("string");
  });

  it("motions.list returns array", async () => {
    const motions = await client.motions.list();
    expect(Array.isArray(motions)).toBe(true);
  });

  it("characters.list returns array", async () => {
    const characters = await client.characters.list();
    expect(Array.isArray(characters)).toBe(true);
  });

  it("jobs.list returns array", async () => {
    const jobs = await client.jobs.list();
    expect(Array.isArray(jobs)).toBe(true);
  });

  it("ttm.create (vqvae-v1) + motions.download glb", async () => {
    const result = await client.ttm.create("a person walking forward", { model: "vqvae-v1" });
    expect(result.character_id).toBeTruthy();
    expect(result.motion_id).toBeTruthy();

    const data = await client.motions.download(result.character_id, result.motion_id, {
      output_format: "glb",
      fps: 30,
    });
    expect(data.byteLength).toBeGreaterThan(0);
  }, 30_000);

  it("ttm.create (vqvae-v1) + motions.download fbx", async () => {
    const result = await client.ttm.create("a person walking forward", { model: "vqvae-v1" });
    expect(result.character_id).toBeTruthy();
    expect(result.motion_id).toBeTruthy();

    const data = await client.motions.download(result.character_id, result.motion_id, {
      output_format: "fbx",
      fps: 60,
    });
    expect(data.byteLength).toBeGreaterThan(0);
  }, 30_000);

  it("ttm.create (diffusion-v2) + motions.download glb", async () => {
    const result = await client.ttm.create("a person dancing", { model: "diffusion-v2" });
    expect(result.character_id).toBeTruthy();
    expect(result.motion_id).toBeTruthy();

    const data = await client.motions.download(result.character_id, result.motion_id, {
      output_format: "glb",
      fps: 30,
    });
    expect(data.byteLength).toBeGreaterThan(0);
  }, 60_000);

  it("characters.create (glb) + characters.download", async () => {
    const result = await client.characters.create({ file: `${FIXTURES_DIR}/pig.glb` });
    expect(result.character_id).toBeTruthy();
    expect(result.url).toBeTruthy();
    expect(result.auto_rig_confidence).not.toBeNull();
    expect(result.auto_rig_confidence).toBeLessThan(0.5);

    const data = await client.characters.download(result.character_id, { output_format: "glb" });
    expect(data.byteLength).toBeGreaterThan(0);
  }, 60_000);

  it("characters.create (fbx) + characters.download", async () => {
    const result = await client.characters.create({ file: `${FIXTURES_DIR}/wrestler.fbx` });
    expect(result.character_id).toBeTruthy();
    expect(result.url).toBeTruthy();
    expect(result.auto_rig_confidence).not.toBeNull();
    expect(result.auto_rig_confidence).toBeGreaterThan(0.5);

    const data = await client.characters.download(result.character_id, { output_format: "fbx" });
    expect(data.byteLength).toBeGreaterThan(0);
  }, 60_000);

  it.skipIf(!shouldRunLong)("characters.create (prompt) + characters.download", async () => {
    const result = await client.characters.create({
      method: "prompt",
      prompt: "a futuristic soldier in heavy armor",
      onPreviewsReady: (previews) => previews[0]?.key ?? null,
    });
    expect(result.character?.id).toBeTruthy();

    const data = await client.characters.download(result.character!.id!, { output_format: "glb" });
    expect(data.byteLength).toBeGreaterThan(0);
  }, 120_000);

  it.skipIf(!shouldRunLong)("vtm.create submits job and polls to FINISHED", async () => {
    const job = await client.vtm.create(`${FIXTURES_DIR}/dance.mp4`);
    expect(job.id).toBeTruthy();
    expect(job.status).toBeTruthy();

    const finished = await client.jobs.wait(job.id, {
      intervalMs: 3000,
      timeoutMs: 300_000,
    });
    expect(finished.status).toBe("FINISHED");

    const motionId = (finished.result as { result?: { id?: string } })?.result?.id;
    expect(motionId).toBeTruthy();

    const data = await client.motions.download(UthanaCharacters.tar, motionId!, {
      output_format: "glb",
      fps: 30,
    });
    expect(data.byteLength).toBeGreaterThan(0);
  }, 300_000);
});
