/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import React from "react";
import {
  UthanaProvider,
  useUthanaCharacters,
  useUthanaCreateCharacter,
  useUthanaDeleteCharacter,
  useUthanaJob,
  useUthanaJobs,
  useUthanaMotion,
  useUthanaIsMotionDownloadAllowed,
  useUthanaMotionDownloads,
  useUthanaMotionPreview,
  useUthanaMotions,
  useUthanaOrg,
  useUthanaRateMotion,
  useUthanaRenameCharacter,
  useUthanaTtm,
  useUthanaUser,
  useUthanaVtm,
} from "@uthana/react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient } = vi.hoisted(() => {
  const mockMotionsList = vi.fn().mockResolvedValue([{ id: "m1", name: "Walk" }]);
  const mockMotionGet = vi.fn().mockResolvedValue({ id: "m1", name: "Walk" });
  const mockMotionPreview = vi.fn().mockResolvedValue(new ArrayBuffer(8));
  const mockMotionRate = vi.fn().mockResolvedValue(undefined);
  const mockMotionDelete = vi.fn().mockResolvedValue({ id: "m1", deleted: true });
  const mockMotionRename = vi.fn().mockResolvedValue({ id: "m1", name: "New Name" });
  const mockCharactersList = vi.fn().mockResolvedValue([{ id: "c1", name: "Tar" }]);
  const mockCharacterCreate = vi.fn().mockResolvedValue({ character_id: "c2", url: "http://x" });
  const mockCharacterRename = vi.fn().mockResolvedValue({ id: "c1", name: "Renamed" });
  const mockCharacterDelete = vi.fn().mockResolvedValue({ id: "c1", deleted: true });
  const mockCharacterGenerateFromText = vi
    .fn()
    .mockResolvedValue({ character_id: "c3", images: [] });
  const mockCharacterGenerateFromImage = vi
    .fn()
    .mockResolvedValue({ character_id: "c4", image: {} });
  const mockCharacterCreateFromImage = vi
    .fn()
    .mockResolvedValue({ character: { id: "c5" }, auto_rig_confidence: 0.9 });
  const mockUser = vi.fn().mockResolvedValue({ id: "u1", name: "Test" });
  const mockOrg = vi.fn().mockResolvedValue({ id: "o1", name: "Org" });
  const mockJobsList = vi.fn().mockResolvedValue([{ id: "j1", status: "FINISHED" }]);
  const mockJobGet = vi.fn().mockResolvedValue({ id: "j1", status: "FINISHED" });
  const mockMotionDownloadsList = vi.fn().mockResolvedValue([]);
  const mockMotionDownloadAllowed = vi.fn().mockResolvedValue(true);
  const mockTtmCreate = vi.fn().mockResolvedValue({ character_id: "tar", motion_id: "m99" });
  const mockVtmCreate = vi.fn().mockResolvedValue({ id: "job1", status: "RESERVED" });

  return {
    mockClient: {
      apiKey: "test-key",
      motions: {
        list: mockMotionsList,
        get: mockMotionGet,
        preview: mockMotionPreview,
        rate: mockMotionRate,
        delete: mockMotionDelete,
        rename: mockMotionRename,
      },
      characters: {
        list: mockCharactersList,
        create: mockCharacterCreate,
        rename: mockCharacterRename,
        delete: mockCharacterDelete,
        generateFromText: mockCharacterGenerateFromText,
        generateFromImage: mockCharacterGenerateFromImage,
        createFromGeneratedImage: mockCharacterCreateFromImage,
      },
      org: { getUser: mockUser, getOrg: mockOrg },
      jobs: { list: mockJobsList, get: mockJobGet },
      motionDownloads: {
        list: mockMotionDownloadsList,
        isAllowed: mockMotionDownloadAllowed,
      },
      ttm: { create: mockTtmCreate },
      vtm: { create: mockVtmCreate },
    },
  };
});

vi.mock("../packages/react/src/client.ts", () => ({
  createUthanaClient: () => mockClient,
  getUthanaClient: () => mockClient,
}));

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <UthanaProvider apiKey="test-key">{children}</UthanaProvider>;
  };
}

describe("React hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useUthanaMotions fetches and returns motions", async () => {
    const { result } = renderHook(() => useUthanaMotions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "m1", name: "Walk" }]);
    expect(mockClient.motions.list).toHaveBeenCalled();
  });

  it("useUthanaMotion fetches single motion when id provided", async () => {
    const { result } = renderHook(() => useUthanaMotion("m1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "m1", name: "Walk" });
    expect(mockClient.motions.get).toHaveBeenCalledWith("m1");
  });

  it("useUthanaMotion is disabled when id is null", async () => {
    const { result } = renderHook(() => useUthanaMotion(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockClient.motions.get).not.toHaveBeenCalled();
  });

  it("useUthanaMotionPreview fetches preview when ids provided", async () => {
    const { result } = renderHook(() => useUthanaMotionPreview("c1", "m1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeInstanceOf(ArrayBuffer);
    expect(mockClient.motions.preview).toHaveBeenCalledWith("c1", "m1");
  });

  it("useUthanaMotionPreview is disabled when ids are null", () => {
    const { result } = renderHook(() => useUthanaMotionPreview(null, null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockClient.motions.preview).not.toHaveBeenCalled();
  });

  it("useUthanaRateMotion calls rate and invalidates", async () => {
    const { result } = renderHook(() => useUthanaRateMotion(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ motion_id: "m1", score: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.motions.rate).toHaveBeenCalledWith("m1", 1, expect.anything());
  });

  it("useUthanaCharacters fetches and returns characters", async () => {
    const { result } = renderHook(() => useUthanaCharacters(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "c1", name: "Tar" }]);
    expect(mockClient.characters.list).toHaveBeenCalled();
  });

  it("useUthanaUser fetches user", async () => {
    const { result } = renderHook(() => useUthanaUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "u1", name: "Test" });
    expect(mockClient.org.getUser).toHaveBeenCalled();
  });

  it("useUthanaOrg fetches org", async () => {
    const { result } = renderHook(() => useUthanaOrg(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "o1", name: "Org" });
    expect(mockClient.org.getOrg).toHaveBeenCalled();
  });

  it("useUthanaJobs fetches jobs", async () => {
    const { result } = renderHook(() => useUthanaJobs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "j1", status: "FINISHED" }]);
    expect(mockClient.jobs.list).toHaveBeenCalled();
  });

  it("useUthanaJob fetches single job", async () => {
    const { result } = renderHook(() => useUthanaJob("j1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "j1", status: "FINISHED" });
    expect(mockClient.jobs.get).toHaveBeenCalledWith("j1");
  });

  it("useUthanaMotionDownloads fetches downloads", async () => {
    const { result } = renderHook(() => useUthanaMotionDownloads(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(mockClient.motionDownloads.list).toHaveBeenCalled();
  });

  it("useUthanaMotionDownloadAllowed checks when ids provided", async () => {
    const { result } = renderHook(() => useUthanaIsMotionDownloadAllowed("c1", "m1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
    expect(mockClient.motionDownloads.isAllowed).toHaveBeenCalledWith("c1", "m1");
  });

  it("useUthanaCreateCharacter exposes create, generate, confirm functions", () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    expect(result.current.create).toBeDefined();
    expect(result.current.generate).toBeDefined();
    expect(result.current.confirm).toBeDefined();
  });

  it("useUthanaCreateCharacter.create calls characters.create for file upload", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.create({ from: "file", file: "path/to/char.glb" });
    });
    expect(result.current.isSuccess).toBe(true);
    expect(mockClient.characters.create).toHaveBeenCalledWith(
      "path/to/char.glb",
      { auto_rig: undefined, front_facing: undefined },
    );
  });

  it("useUthanaCreateCharacter.generate calls generate_from_text for prompt flow", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.generate({ from: "prompt", prompt: "a robot" });
    });
    expect(result.current.isAwaitingSelection).toBe(true);
    expect(mockClient.characters.generateFromText).toHaveBeenCalledWith("a robot");
    expect(result.current.previews).toEqual([]);
  });

  it("useUthanaCreateCharacter.generate with onPreviewsReady auto-confirms", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    mockClient.characters.generateFromText.mockResolvedValueOnce({
      character_id: "c3",
      images: [{ key: "img1", url: "http://img1" }],
    });

    await act(async () => {
      await result.current.generate({
        from: "prompt",
        prompt: "a robot",
        onPreviewsReady: (previews) => previews[0].key,
      });
    });
    expect(result.current.isSuccess).toBe(true);
    expect(mockClient.characters.createFromGeneratedImage).toHaveBeenCalledWith(
      "c3",
      "img1",
      "a robot",
      { name: undefined },
    );
  });

  it("useUthanaCreateCharacter.generate calls generate_from_image for image flow", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    const blob = new Blob(["data"]);
    await act(async () => {
      await result.current.generate({ from: "image", file: blob, prompt: "a robot" });
    });
    expect(result.current.isAwaitingSelection).toBe(true);
    expect(mockClient.characters.generateFromImage).toHaveBeenCalledWith(blob);
  });

  it("useUthanaCreateCharacter.confirm calls create_from_generated_image", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    mockClient.characters.generateFromText.mockResolvedValueOnce({
      character_id: "c3",
      images: [{ key: "img1", url: "http://img1" }],
    });

    await act(async () => {
      await result.current.generate({ from: "prompt", prompt: "a robot" });
    });
    expect(result.current.isAwaitingSelection).toBe(true);

    await act(async () => {
      await result.current.confirm({ image_key: "img1" });
    });
    expect(result.current.isSuccess).toBe(true);
    expect(mockClient.characters.createFromGeneratedImage).toHaveBeenCalledWith(
      "c3",
      "img1",
      "a robot",
      { name: undefined },
    );
  });

  it("useUthanaRenameCharacter calls characters.rename on mutate", async () => {
    const { result } = renderHook(() => useUthanaRenameCharacter(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ character_id: "c1", name: "Renamed" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.characters.rename).toHaveBeenCalledWith("c1", "Renamed");
  });

  it("useUthanaDeleteCharacter calls characters.delete on mutate", async () => {
    const { result } = renderHook(() => useUthanaDeleteCharacter(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ character_id: "c1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.characters.delete).toHaveBeenCalledWith("c1");
  });

  it("useUthanaJob is disabled when id is null", () => {
    const { result } = renderHook(() => useUthanaJob(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockClient.jobs.get).not.toHaveBeenCalled();
  });

  it("useUthanaJobs passes method filter", async () => {
    const { result } = renderHook(() => useUthanaJobs("VideoToMotion"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.jobs.list).toHaveBeenCalledWith("VideoToMotion");
  });

  it("useUthanaTtm calls ttm.create on mutate", async () => {
    const { result } = renderHook(() => useUthanaTtm(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ prompt: "a person walking" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.ttm.create).toHaveBeenCalledWith(
      "a person walking",
      expect.objectContaining({ prompt: "a person walking" }),
    );
    expect(result.current.data?.motion_id).toBe("m99");
  });

  it("useUthanaVtm calls vtm.create on mutate", async () => {
    const { result } = renderHook(() => useUthanaVtm(), {
      wrapper: createWrapper(),
    });

    const blob = new Blob(["video"]);
    result.current.mutate({ file: blob });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.vtm.create).toHaveBeenCalledWith(
      blob,
      expect.objectContaining({ file: blob }),
    );
    expect(result.current.data?.id).toBe("job1");
  });
});
