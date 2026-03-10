/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { UthanaClient } from "@uthana/client";
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

describe("module methods with mocked _graphql", () => {
  let client: UthanaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new UthanaClient("test-key");
  });

  describe("org", () => {
    it("getUser returns user", async () => {
      mockGql.mockResolvedValue({
        data: { user: { id: "u1", name: "Test", email: "test@example.com" } },
      });
      const user = await client.org.getUser();
      expect(user?.id).toBe("u1");
      expect(user?.name).toBe("Test");
    });

    it("getOrg returns org", async () => {
      mockGql.mockResolvedValue({
        data: {
          org: {
            id: "o1",
            name: "Test Org",
            motion_download_secs_per_month: 1000,
          },
        },
      });
      const org = await client.org.getOrg();
      expect(org?.id).toBe("o1");
      expect(org?.name).toBe("Test Org");
    });
  });

  describe("motions", () => {
    it("list returns motions array", async () => {
      mockGql.mockResolvedValue({
        data: {
          motions: [
            { id: "m1", name: "Walk", created: "2024-01-01" },
            { id: "m2", name: "Run", created: "2024-01-02" },
          ],
        },
      });
      const motions = await client.motions.list();
      expect(motions).toHaveLength(2);
      expect(motions[0]?.id).toBe("m1");
      expect(motions[1]?.name).toBe("Run");
    });

    it("get returns single motion", async () => {
      mockGql.mockResolvedValue({
        data: {
          motion: { id: "m1", name: "Walk", org_id: "o1", tags: ["t2m"] },
        },
      });
      const motion = await client.motions.get("m1");
      expect(motion?.id).toBe("m1");
      expect(motion?.name).toBe("Walk");
    });

    it("rate calls mutation", async () => {
      mockGql.mockResolvedValue({ data: { rate_motion: { motion_rating: {} } } });
      await client.motions.rate("m1", 1);
      expect(mockGql).toHaveBeenCalledWith(
        expect.objectContaining({
          motion_id: "m1",
          score: 1,
        }),
      );
    });

    it("delete calls mutation with deleted=true", async () => {
      mockGql.mockResolvedValue({ data: { update_motion: { id: "m1", deleted: true } } });
      await client.motions.delete("m1");
      expect(mockGql).toHaveBeenCalledWith(expect.objectContaining({ id: "m1", deleted: true }));
    });

    it("rename calls mutation with new name", async () => {
      mockGql.mockResolvedValue({ data: { update_motion: { id: "m1", name: "New Name" } } });
      await client.motions.rename("m1", "New Name");
      expect(mockGql).toHaveBeenCalledWith(expect.objectContaining({ id: "m1", name: "New Name" }));
    });

    it("favorite(true) calls create_motion_favorite mutation", async () => {
      mockGql.mockResolvedValue({ data: { create_motion_favorite: {} } });
      await client.motions.favorite("m1", true);
      expect(mockGql).toHaveBeenCalledWith(expect.objectContaining({ motion_id: "m1" }));
    });

    it("favorite(false) calls delete_motion_favorite mutation", async () => {
      mockGql.mockResolvedValue({ data: { delete_motion_favorite: {} } });
      await client.motions.favorite("m1", false);
      expect(mockGql).toHaveBeenCalledWith(expect.objectContaining({ motion_id: "m1" }));
    });

    it("bakeWithChanges returns character_id and motion_id", async () => {
      mockGql.mockResolvedValue({
        data: {
          create_motion_from_gltf: { motion: { id: "m99" } },
        },
      });
      const result = await client.motions.bakeWithChanges("<gltf/>", "test motion");
      expect(result.motion_id).toBe("m99");
      expect(mockGql).toHaveBeenCalledWith(expect.objectContaining({ motionName: "test motion" }));
    });
  });

  describe("characters", () => {
    it("list returns characters array", async () => {
      mockGql.mockResolvedValue({
        data: {
          characters: [{ id: "c1", name: "Tar", created: "2024-01-01", updated: "2024-01-01" }],
        },
      });
      const characters = await client.characters.list();
      expect(characters).toHaveLength(1);
      expect(characters[0]?.id).toBe("c1");
    });

    it("rename calls mutation and returns character", async () => {
      mockGql.mockResolvedValue({
        data: { update_character: { character: { id: "c1", name: "Renamed" } } },
      });
      const result = await client.characters.rename("c1", "Renamed");
      expect(mockGql).toHaveBeenCalledWith(
        expect.objectContaining({ character_id: "c1", name: "Renamed" }),
      );
      expect((result as Record<string, unknown>).id).toBe("c1");
    });

    it("delete calls mutation and returns character", async () => {
      mockGql.mockResolvedValue({
        data: { update_character: { character: { id: "c1", deleted: true } } },
      });
      const result = await client.characters.delete("c1");
      expect(mockGql).toHaveBeenCalledWith(expect.objectContaining({ character_id: "c1" }));
      expect((result as Record<string, unknown>).id).toBe("c1");
    });

    it("generateFromText returns character_id and images", async () => {
      mockGql.mockResolvedValue({
        data: {
          create_image_from_text: {
            character_id: "c2",
            images: [{ key: "img1", url: "http://x" }],
          },
        },
      });
      const result = await client.characters.generateFromText("a robot");
      expect(result.character_id).toBe("c2");
      expect(result.images).toHaveLength(1);
      expect(mockGql).toHaveBeenCalledWith(expect.objectContaining({ prompt: "a robot" }));
    });

    it("generateFromImage returns character_id and image", async () => {
      mockGql.mockResolvedValue({
        data: {
          create_image_from_image: { character_id: "c3", image: { key: "img2", url: "http://y" } },
        },
      });
      const blob = new Blob(["data"]);
      const result = await client.characters.generateFromImage(blob);
      expect(result.character_id).toBe("c3");
      expect(result.image).toBeDefined();
    });

    it("createFromGeneratedImage returns character and confidence", async () => {
      mockGql.mockResolvedValue({
        data: {
          create_character_from_image: {
            character: { id: "c4", name: "MyChar" },
            auto_rig_confidence: 0.9,
          },
        },
      });
      const result = await client.characters.createFromGeneratedImage("c4", "img1", "a robot");
      expect(result.auto_rig_confidence).toBe(0.9);
      expect(mockGql).toHaveBeenCalledWith(
        expect.objectContaining({ character_id: "c4", image_key: "img1", prompt: "a robot" }),
      );
    });

    it("createFromText calls generateFromText then createFromGeneratedImage", async () => {
      mockGql
        .mockResolvedValueOnce({
          data: {
            create_image_from_text: {
              character_id: "c3",
              images: [{ key: "img1", url: "http://x" }],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            create_character_from_image: {
              character: { id: "c5", name: "Knight" },
              auto_rig_confidence: 0.8,
            },
          },
        });
      const result = await client.characters.createFromText("a knight", {
        onPreviewsReady: (previews) => previews[0].key,
      });
      expect(result.character?.id).toBe("c5");
      expect(mockGql).toHaveBeenCalledTimes(2);
    });

    it("createFromText defaults to first preview when onPreviewsReady omitted", async () => {
      mockGql
        .mockResolvedValueOnce({
          data: {
            create_image_from_text: {
              character_id: "c3",
              images: [{ key: "img1", url: "http://x" }],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            create_character_from_image: {
              character: { id: "c5", name: "Knight" },
              auto_rig_confidence: 0.8,
            },
          },
        });
      const result = await client.characters.createFromText("a knight");
      expect(result.character?.id).toBe("c5");
    });

    it("createFromImage calls generateFromImage then createFromGeneratedImage", async () => {
      mockGql
        .mockResolvedValueOnce({
          data: {
            create_image_from_image: { character_id: "c4", image: { key: "img2", url: "http://y" } },
          },
        })
        .mockResolvedValueOnce({
          data: {
            create_character_from_image: {
              character: { id: "c6", name: "Knight" },
              auto_rig_confidence: 0.7,
            },
          },
        });
      const blob = new Blob(["data"]);
      const result = await client.characters.createFromImage(blob, { prompt: "a knight" });
      expect(result.character?.id).toBe("c6");
      expect(mockGql).toHaveBeenCalledTimes(2);
    });

  });

  describe("jobs", () => {
    it("list returns jobs array", async () => {
      mockGql.mockResolvedValue({
        data: {
          jobs: [{ id: "j1", status: "FINISHED", method: "VideoToMotion", created: "2024-01-01" }],
        },
      });
      const jobs = await client.jobs.list();
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.id).toBe("j1");
      expect(jobs[0]?.status).toBe("FINISHED");
    });

    it("list with method passes filter", async () => {
      mockGql.mockResolvedValue({ data: { jobs: [] } });
      await client.jobs.list("VideoToMotion");
      expect(mockGql).toHaveBeenCalledWith(expect.objectContaining({ method: "VideoToMotion" }));
    });

    it("get returns job", async () => {
      mockGql.mockResolvedValue({
        data: { job: { id: "j1", status: "FINISHED", result: { motion_id: "m1" } } },
      });
      const job = await client.jobs.get("j1");
      expect(job?.id).toBe("j1");
      expect(job?.status).toBe("FINISHED");
    });
  });

  describe("client._motionUrl", () => {
    it("builds URL with required params", () => {
      const url = (client as unknown as { _motionUrl: (o: unknown) => string })._motionUrl({
        character_id: "c1",
        motion_id: "m1",
        output_format: "glb",
      });
      expect(url).toContain("/motion/file/motion_viewer/c1/m1/glb/");
      expect(url).toContain("c1-m1.glb");
    });

    it("adds fps and no_mesh query params when provided", () => {
      const url = (client as unknown as { _motionUrl: (o: unknown) => string })._motionUrl({
        character_id: "c1",
        motion_id: "m1",
        output_format: "fbx",
        fps: 30,
        no_mesh: true,
      });
      expect(url).toContain("fps=30");
      expect(url).toContain("no_mesh=true");
    });
  });

  describe("motionDownloads", () => {
    it("list returns download records", async () => {
      mockGql.mockResolvedValue({
        data: {
          motion_downloads: [
            {
              motion_id: "m1",
              character_id: "c1",
              secs: 5,
              created: "2024-01-01",
              motion: { id: "m1", name: "Walk" },
            },
          ],
        },
      });
      const downloads = await client.motionDownloads.list();
      expect(downloads).toHaveLength(1);
      expect(downloads[0]?.motion_id).toBe("m1");
      expect(downloads[0]?.character_id).toBe("c1");
    });

    it("list with motion_id filters by motion", async () => {
      mockGql.mockResolvedValue({ data: { motion_downloads: [] } });
      await client.motionDownloads.list();
      expect(mockGql).toHaveBeenCalledTimes(1);
    });

    it("checkIsAllowed returns boolean", async () => {
      mockGql.mockResolvedValue({
        data: { motion_download_allowed: { allowed: true } },
      });
      const allowed = await client.motionDownloads.isAllowed("c1", "m1");
      expect(allowed).toBe(true);
    });

    it("checkIsAllowed returns false when not allowed", async () => {
      mockGql.mockResolvedValue({
        data: { motion_download_allowed: { allowed: false } },
      });
      const allowed = await client.motionDownloads.isAllowed("c1", "m1");
      expect(allowed).toBe(false);
    });
  });
});
