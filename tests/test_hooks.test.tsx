/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import React from "react";
import {
  UthanaProvider,
  useUthanaCharacters,
  useUthanaCreateCharacter,
  useUthanaCreateCharacterFromImage,
  useUthanaDeleteCharacter,
  useUthanaGenerateCharacterFromImage,
  useUthanaGenerateCharacterFromText,
  useUthanaJob,
  useUthanaJobs,
  useUthanaMotion,
  useUthanaMotionDownloadAllowed,
  useUthanaMotionDownloads,
  useUthanaMotions,
  useUthanaOrg,
  useUthanaRateMotion,
  useUthanaRenameCharacter,
  useUthanaTtm,
  useUthanaUser,
  useUthanaVtm,
} from "@uthana/react";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient } = vi.hoisted(() => {
  const mockMotionsList = vi.fn().mockResolvedValue([{ id: "m1", name: "Walk" }]);
  const mockMotionGet = vi.fn().mockResolvedValue({ id: "m1", name: "Walk" });
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
        rate: mockMotionRate,
        delete: mockMotionDelete,
        rename: mockMotionRename,
      },
      characters: {
        list: mockCharactersList,
        create: mockCharacterCreate,
        rename: mockCharacterRename,
        delete: mockCharacterDelete,
        generate_from_text: mockCharacterGenerateFromText,
        generate_from_image: mockCharacterGenerateFromImage,
        create_from_generated_image: mockCharacterCreateFromImage,
      },
      org: { get_user: mockUser, get_org: mockOrg },
      jobs: { list: mockJobsList, get: mockJobGet },
      motionDownloads: {
        list: mockMotionDownloadsList,
        check_allowed: mockMotionDownloadAllowed,
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
    expect(mockClient.org.get_user).toHaveBeenCalled();
  });

  it("useUthanaOrg fetches org", async () => {
    const { result } = renderHook(() => useUthanaOrg(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "o1", name: "Org" });
    expect(mockClient.org.get_org).toHaveBeenCalled();
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
    const { result } = renderHook(() => useUthanaMotionDownloadAllowed("c1", "m1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
    expect(mockClient.motionDownloads.check_allowed).toHaveBeenCalledWith("c1", "m1");
  });

  it("useUthanaCreateCharacter returns mutation", () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
  });

  it("useUthanaCreateCharacter calls characters.create on mutate", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ file: "path/to/char.glb" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.characters.create).toHaveBeenCalledWith(
      "path/to/char.glb",
      expect.objectContaining({ file: "path/to/char.glb" }),
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

  it("useUthanaGenerateCharacterFromText calls generate_from_text", async () => {
    const { result } = renderHook(() => useUthanaGenerateCharacterFromText(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ prompt: "a robot" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.characters.generate_from_text).toHaveBeenCalledWith("a robot");
    expect(result.current.data?.character_id).toBe("c3");
  });

  it("useUthanaGenerateCharacterFromImage calls generate_from_image", async () => {
    const { result } = renderHook(() => useUthanaGenerateCharacterFromImage(), {
      wrapper: createWrapper(),
    });

    const blob = new Blob(["data"]);
    result.current.mutate({ file: blob });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.characters.generate_from_image).toHaveBeenCalledWith(blob);
    expect(result.current.data?.character_id).toBe("c4");
  });

  it("useUthanaCreateCharacterFromImage calls create_from_generated_image", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacterFromImage(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ character_id: "c4", image_key: "img1", prompt: "a robot" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.characters.create_from_generated_image).toHaveBeenCalledWith(
      "c4",
      "img1",
      "a robot",
      expect.anything(),
    );
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
