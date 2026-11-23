import { UthanaClient } from "@uthana/client";
import type { VtmModelType } from "@uthana/client";
import { describe, expect, it, vi } from "vitest";
import { models } from "../packages/client/src/models";

const cases: [VtmModelType | undefined, string][] = [
  [undefined, "video-to-motion-2.0"],
  ["video-to-motion-v2", "video-to-motion-2.0"],
  ["video-to-motion-2.1", "video-to-motion-2.1"],
  ["video-to-motion-3.0", "video-to-motion-3.0"],
];

describe("VTM model selection", () => {
  it.each(cases)("passes %s through both upload entry points", async (model, expected) => {
    const client = new UthanaClient("synthetic-key");
    const upload = vi.spyOn(client, "_graphqlUpload").mockResolvedValue({
      id: "job1",
      status: "READY",
    });
    await client.vtm.createFromBytes("clip.mp4", new Uint8Array([1, 2]), { model });
    await client.vtm.create(new File(["video"], "clip.mp4"), { model });
    expect(upload).toHaveBeenCalledTimes(2);
    for (const call of upload.mock.calls) {
      expect(call[0]).toContain("model: $model");
      expect(call[1]).toMatchObject({ model: expected });
    }
  });

  it("lists VTM3 while preserving the default", () => {
    expect(models.vtm.models).toContain("video-to-motion-3.0");
    expect(models.vtm.default).toBe("video-to-motion-2.0");
  });
});

describe("video upload limits", () => {
  it("rejects an oversized file before reading or submitting it", async () => {
    const client = new UthanaClient("synthetic-key");
    const upload = vi.spyOn(client, "_graphqlUpload");
    const file = new File(["video"], "clip.mp4");
    Object.defineProperty(file, "size", { value: 200 * 1024 * 1024 + 1 });
    await expect(client.vtm.create(file, { maxBytes: null })).rejects.toThrow("200 MiB");
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects oversized byte snapshots even when the optional limit is disabled", async () => {
    const client = new UthanaClient("synthetic-key");
    const upload = vi.spyOn(client, "_graphqlUpload");
    const bytes = new Uint8Array(1);
    Object.defineProperty(bytes, "byteLength", { value: 200 * 1024 * 1024 + 1 });
    await expect(client.vtm.createFromBytes("clip.mp4", bytes, { maxBytes: null })).rejects.toThrow(
      "200 MiB",
    );
    expect(upload).not.toHaveBeenCalled();
  });
});
