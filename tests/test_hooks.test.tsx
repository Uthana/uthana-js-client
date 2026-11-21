/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import React from "react";
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from "@tanstack/react-query";
import {
  UthanaProvider,
  useUthanaCharacter,
  useUthanaModifyCharacter,
  useUthanaModifyMotion,
  useUthanaCharacters,
  useUthanaCharactersPaged,
  useUthanaMotionsPaged,
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
  const mockCreateFromFile = vi.fn().mockResolvedValue({ character_id: "c2", url: "http://x" });
  const mockCreateFromPrompt = vi.fn().mockResolvedValue({
    character_id: "c3",
    previews: [],
    prompt: "a robot",
  });
  const mockCreateFromImage = vi.fn().mockResolvedValue({
    character: { id: "c6" },
    auto_rig_confidence: 0.7,
  });
  const mockCharacterRename = vi.fn().mockResolvedValue({ id: "c1", name: "Renamed" });
  const mockCharacterDelete = vi.fn().mockResolvedValue({ id: "c1", deleted: true });
  // Step-2 finalization (generateFromImage)
  const mockCharacterGenerateFromImage = vi
    .fn()
    .mockResolvedValue({ character: { id: "c5" }, auto_rig_confidence: 0.9 });
  const mockUser = vi.fn().mockResolvedValue({ id: "u1", name: "Test" });
  const mockOrg = vi.fn().mockResolvedValue({ id: "o1", name: "Org" });
  const mockJobsList = vi.fn().mockResolvedValue([{ id: "j1", status: "FINISHED" }]);
  const mockJobGet = vi.fn().mockResolvedValue({ id: "j1", status: "FINISHED" });
  const mockMotionDownloadsList = vi.fn().mockResolvedValue([]);
  const mockMotionDownloadAllowed = vi.fn().mockResolvedValue({ allowed: true, reason: null });
  const mockTtmCreate = vi.fn().mockResolvedValue({ character_id: "tar", motion_id: "m99" });
  const mockVtmCreate = vi.fn().mockResolvedValue({ id: "job1", status: "RESERVED" });

  return {
    mockClient: {
      apiKey: "test-key",
      motions: {
        modify: vi.fn().mockResolvedValue({ id: "m1", name: "Hero", deleted: null }),
        restore: vi.fn().mockResolvedValue({ id: "m1", deleted: null }),
        listPaged: vi.fn().mockResolvedValue({ items: [{ id: "m1" }], next_cursor: null }),
        list: mockMotionsList,
        get: mockMotionGet,
        preview: mockMotionPreview,
        rate: mockMotionRate,
        delete: mockMotionDelete,
        rename: mockMotionRename,
      },
      characters: {
        modify: vi.fn().mockResolvedValue({ id: "c1", name: "Hero", deleted: null }),
        get: vi.fn().mockResolvedValue({ id: "c1", org_id: "org", created: null }),
        restore: vi.fn().mockResolvedValue({ id: "c1", deleted: null }),
        listPaged: vi.fn().mockResolvedValue({ items: [{ id: "c1" }], next_cursor: "next" }),
        list: mockCharactersList,
        createFromFile: mockCreateFromFile,
        createFromPrompt: mockCreateFromPrompt,
        createFromImage: mockCreateFromImage,
        rename: mockCharacterRename,
        delete: mockCharacterDelete,
        generateFromImage: mockCharacterGenerateFromImage,
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

vi.mock("../packages/react/src/client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../packages/react/src/client.ts")>()),
  createUthanaClient: (apiKey: string) =>
    apiKey === "other-account"
      ? {
          ...mockClient,
          characters: {
            ...mockClient.characters,
            listPaged: vi
              .fn()
              .mockResolvedValue({ items: [{ id: "other-character" }], next_cursor: null }),
          },
          motions: {
            ...mockClient.motions,
            listPaged: vi
              .fn()
              .mockResolvedValue({ items: [{ id: "other-motion" }], next_cursor: null }),
          },
        }
      : mockClient,
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
    expect(result.current.motions).toEqual([{ id: "m1", name: "Walk" }]);
    expect(mockClient.motions.list).toHaveBeenCalled();
  });

  it("useUthanaMotion fetches single motion when id provided", async () => {
    const { result } = renderHook(() => useUthanaMotion("m1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.motion).toEqual({ id: "m1", name: "Walk" });
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
    expect(result.current.preview).toBeInstanceOf(ArrayBuffer);
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
    expect(result.current.characters).toEqual([{ id: "c1", name: "Tar" }]);
    expect(mockClient.characters.list).toHaveBeenCalled();
  });

  it("useUthanaUser fetches user", async () => {
    const { result } = renderHook(() => useUthanaUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.user).toEqual({ id: "u1", name: "Test" });
    expect(mockClient.org.getUser).toHaveBeenCalled();
  });

  it("useUthanaOrg fetches org", async () => {
    const { result } = renderHook(() => useUthanaOrg(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.org).toEqual({ id: "o1", name: "Org" });
    expect(mockClient.org.getOrg).toHaveBeenCalled();
  });

  it("useUthanaJobs fetches jobs", async () => {
    const { result } = renderHook(() => useUthanaJobs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.jobs).toEqual([{ id: "j1", status: "FINISHED" }]);
    expect(mockClient.jobs.list).toHaveBeenCalled();
  });

  it("useUthanaJob fetches single job", async () => {
    const { result } = renderHook(() => useUthanaJob("j1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.job).toEqual({ id: "j1", status: "FINISHED" });
    expect(mockClient.jobs.get).toHaveBeenCalledWith("j1");
  });

  it("useUthanaMotionDownloads fetches downloads", async () => {
    const { result } = renderHook(() => useUthanaMotionDownloads(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.downloads).toEqual([]);
    expect(mockClient.motionDownloads.list).toHaveBeenCalled();
  });

  it("useUthanaMotionDownloadAllowed checks when ids provided", async () => {
    const { result } = renderHook(() => useUthanaIsMotionDownloadAllowed("c1", "m1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isAllowed).toBe(true);
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

  it("useUthanaCreateCharacter.create calls createFromFile for file upload", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.create({ from: "file", file: "path/to/char.glb" });
    });
    expect(result.current.isSuccess).toBe(true);
    expect(mockClient.characters.createFromFile).toHaveBeenCalledWith("path/to/char.glb", {
      auto_rig: undefined,
      front_facing: undefined,
      rerig_target: undefined,
      include_fingers: undefined,
    });
  });

  it("useUthanaCreateCharacter.generate calls createFromPrompt for prompt flow", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    mockClient.characters.createFromPrompt.mockResolvedValueOnce({
      character_id: "c3",
      previews: [],
      prompt: "a robot",
    });

    await act(async () => {
      await result.current.generate({ from: "prompt", prompt: "a robot" });
    });
    expect(result.current.isAwaitingSelection).toBe(true);
    expect(mockClient.characters.createFromPrompt).toHaveBeenCalledWith({
      prompt: "a robot",
      name: undefined,
    });
    expect(result.current.previews).toEqual([]);
  });

  it("useUthanaCreateCharacter.generate with onPreviewsReady auto-confirms via generateFromImage", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    mockClient.characters.createFromPrompt.mockResolvedValueOnce({
      character_id: "c3",
      previews: [{ key: "img1", url: "http://img1" }],
      prompt: "a robot",
    });

    await act(async () => {
      await result.current.generate({
        from: "prompt",
        prompt: "a robot",
        onPreviewsReady: (previews) => previews[0].key,
      });
    });
    expect(result.current.isSuccess).toBe(true);
    expect(mockClient.characters.generateFromImage).toHaveBeenCalledWith(
      expect.objectContaining({ character_id: "c3", prompt: "a robot" }),
      "img1",
      undefined,
    );
  });

  it("useUthanaCreateCharacter.generate calls createFromImage for image flow (single-step)", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    mockClient.characters.createFromImage.mockResolvedValueOnce({
      character: { id: "c6" },
      auto_rig_confidence: 0.7,
    });

    const blob = new Blob(["data"]);
    await act(async () => {
      await result.current.generate({ from: "image", file: blob });
    });
    // Image flow is single-step — should go straight to success, no awaiting_selection
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isAwaitingSelection).toBe(false);
    expect(mockClient.characters.createFromImage).toHaveBeenCalledWith(blob, { name: undefined });
  });

  it("useUthanaCreateCharacter.confirm calls generateFromImage with pending and key", async () => {
    const { result } = renderHook(() => useUthanaCreateCharacter(), {
      wrapper: createWrapper(),
    });

    mockClient.characters.createFromPrompt.mockResolvedValueOnce({
      character_id: "c3",
      previews: [{ key: "img1", url: "http://img1" }],
      prompt: "a robot",
    });

    await act(async () => {
      await result.current.generate({ from: "prompt", prompt: "a robot" });
    });
    expect(result.current.isAwaitingSelection).toBe(true);

    await act(async () => {
      await result.current.confirm({ image_key: "img1" });
    });
    expect(result.current.isSuccess).toBe(true);
    expect(mockClient.characters.generateFromImage).toHaveBeenCalledWith(
      expect.objectContaining({ character_id: "c3", prompt: "a robot" }),
      "img1",
      undefined,
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

describe("paged asset hooks", () => {
  it("keeps character filter and cursor requests separate in the query cache", async () => {
    mockClient.characters.listPaged.mockClear();
    const { result, rerender } = renderHook(
      ({ cursor }: { cursor: string | null }) =>
        useUthanaCharactersPaged({ source: "mine", cursor }),
      { wrapper: createWrapper(), initialProps: { cursor: null } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.next_cursor).toBe("next");
    rerender({ cursor: "next" });
    await waitFor(() =>
      expect(mockClient.characters.listPaged).toHaveBeenCalledWith({
        source: "mine",
        cursor: "next",
      }),
    );
    expect(mockClient.characters.listPaged).toHaveBeenCalledWith({ source: "mine", cursor: null });
  });

  it("passes motion search, source, sort and method options", async () => {
    const options = {
      query: "walk",
      source: "uthana",
      order: "name_desc",
      method: "TextToMotion",
      limit: 10,
    } as const;
    const { result } = renderHook(() => useUthanaMotionsPaged(options), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.motions.listPaged).toHaveBeenCalledWith(options);
    expect(result.current.data?.items).toEqual([{ id: "m1" }]);
  });
});

describe("character detail and modification hooks", () => {
  it("reads character detail and disables null selections", async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useUthanaCharacter(id),
      { wrapper: createWrapper(), initialProps: { id: null } },
    );
    expect(result.current.isFetching).toBe(false);
    rerender({ id: "c1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.org_id).toBe("org");
  });
  it("restores the selected character", async () => {
    const { result } = renderHook(() => useUthanaModifyCharacter(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ character_id: "c1", deleted: false });
    });
    expect(mockClient.characters.modify).toHaveBeenCalledWith({
      character_id: "c1",
      deleted: false,
    });
  });
  it("restores the selected motion", async () => {
    const { result } = renderHook(() => useUthanaModifyMotion(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ motion_id: "m1", deleted: false });
    });
    expect(mockClient.motions.modify).toHaveBeenCalledWith({ motion_id: "m1", deleted: false });
  });
});

describe("restore retry policy", () => {
  for (const { kind, useRestore } of [
    {
      kind: "characters",
      useRestore: () => {
        const modify = useUthanaModifyCharacter();
        return () => modify.mutateAsync({ character_id: "c1", deleted: false });
      },
    },
    {
      kind: "motions",
      useRestore: () => {
        const modify = useUthanaModifyMotion();
        return () => modify.mutateAsync({ motion_id: "m1", deleted: false });
      },
    },
  ] as const) {
    it(`does not retry uncertain ${kind} restores despite cache defaults`, async () => {
      const error = new Error("Restore outcome is uncertain");
      mockClient[kind].modify.mockReset().mockRejectedValue(error);
      const cache = new QueryClient({
        defaultOptions: { mutations: { retry: 2, retryDelay: 0 } },
      });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={cache}>
          <UthanaProvider apiKey="test-key" queryClient={cache}>
            {children}
          </UthanaProvider>
        </QueryClientProvider>
      );
      const { result } = renderHook(() => useRestore(), { wrapper });
      await act(async () => {
        await expect(result.current()).rejects.toBe(error);
      });
      expect(mockClient[kind].modify).toHaveBeenCalledTimes(1);
      cache.clear();
      mockClient[kind].modify.mockResolvedValue({
        id: kind === "characters" ? "c1" : "m1",
        name: "Hero",
        deleted: null,
      });
    });
  }
});

describe("paged hook error recovery", () => {
  it("reports invalid character cursors without automatic retries", async () => {
    mockClient.characters.listPaged.mockReset().mockRejectedValue(new Error("Invalid page cursor"));
    const { result } = renderHook(
      () => useUthanaCharactersPaged({ cursor: "bad-character-cursor" }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockClient.characters.listPaged).toHaveBeenCalledTimes(1);
    mockClient.characters.listPaged.mockResolvedValue({ items: [], next_cursor: null });
  });
  it("reports invalid motion cursors without automatic retries", async () => {
    mockClient.motions.listPaged.mockReset().mockRejectedValue(new Error("Invalid page cursor"));
    const { result } = renderHook(() => useUthanaMotionsPaged({ cursor: "bad-motion-cursor" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockClient.motions.listPaged).toHaveBeenCalledTimes(1);
    mockClient.motions.listPaged.mockResolvedValue({ items: [], next_cursor: null });
  });
});

it("does not expose the previous account's pages through a shared query cache", async () => {
  let apiKey = "test-key";
  const cache = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={cache}>
      <UthanaProvider apiKey={apiKey} queryClient={cache}>
        {children}
      </UthanaProvider>
    </QueryClientProvider>
  );
  mockClient.characters.listPaged.mockResolvedValue({
    items: [{ id: "first-character" }],
    next_cursor: null,
  });
  const { result, rerender } = renderHook(() => useUthanaCharactersPaged(), { wrapper });
  await waitFor(() => expect(result.current.data?.items[0]?.id).toBe("first-character"));
  apiKey = "other-account";
  rerender();
  expect(result.current.data?.items[0]?.id).not.toBe("first-character");
  await waitFor(() => expect(result.current.data?.items[0]?.id).toBe("other-character"));
  const keys = JSON.stringify(
    cache
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey),
  );
  expect(keys).not.toContain("test-key");
  expect(keys).not.toContain("other-account");
});

it("hydrates scoped pages across distinct server and browser client instances", async () => {
  const serverCache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  const makeWrapper =
    (cache: QueryClient, apiKey: string) =>
    ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={cache}>
        <UthanaProvider apiKey={apiKey} queryScope="user-42:org-7" queryClient={cache}>
          {children}
        </UthanaProvider>
      </QueryClientProvider>
    );
  mockClient.characters.listPaged.mockResolvedValue({
    items: [{ id: "hydrated" }],
    next_cursor: null,
  });
  const server = renderHook(() => useUthanaCharactersPaged(), {
    wrapper: makeWrapper(serverCache, "test-key"),
  });
  await waitFor(() => expect(server.result.current.isSuccess).toBe(true));
  server.unmount();
  const payload = JSON.parse(JSON.stringify(dehydrate(serverCache)));
  expect(JSON.stringify(payload)).not.toContain("test-key");
  const browserCache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  hydrate(browserCache, payload);
  mockClient.characters.listPaged.mockClear();
  const browser = renderHook(() => useUthanaCharactersPaged(), {
    wrapper: makeWrapper(browserCache, "other-account"),
  });
  expect(browser.result.current.data?.items[0]?.id).toBe("hydrated");
  expect(mockClient.characters.listPaged).not.toHaveBeenCalled();
});

it.each(["characters", "motions"] as const)(
  "modifies %s explicitly and refreshes cached records",
  async (kind) => {
    mockClient[kind].modify.mockClear();
    const cache = new QueryClient();
    const id = kind === "characters" ? "c1" : "m1";
    const detail =
      kind === "characters"
        ? ["uthana", "characters", "detail", "scope", id]
        : ["uthana", "motion", id];
    const page = ["uthana", kind, "paged", "scope", {}];
    cache.setQueryData(detail, { id });
    cache.setQueryData(page, { items: [{ id }] });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={cache}>
        <UthanaProvider apiKey="test-key" queryClient={cache}>
          {children}
        </UthanaProvider>
      </QueryClientProvider>
    );
    const hook = kind === "characters" ? useUthanaModifyCharacter : useUthanaModifyMotion;
    const { result } = renderHook(() => hook(), { wrapper });
    const params =
      kind === "characters"
        ? { character_id: id, name: "Hero", deleted: false }
        : { motion_id: id, name: "Hero", deleted: false };
    expect(mockClient[kind].modify).not.toHaveBeenCalled();
    // @ts-expect-error The parameter shape follows the selected resource in this parameterized test.
    act(() => result.current.mutate(params));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient[kind].modify).toHaveBeenCalledTimes(1);
    expect(mockClient[kind].modify).toHaveBeenCalledWith(params);
    expect(cache.getQueryState(detail)?.isInvalidated).toBe(true);
    expect(cache.getQueryState(page)?.isInvalidated).toBe(true);
  },
);
