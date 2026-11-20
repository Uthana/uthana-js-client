import { UthanaClient, UthanaError } from "@uthana/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGql = vi.hoisted(() => vi.fn());
vi.mock("graffle", () => ({
  Graffle: {
    create: () => {
      const chain = { transport: () => chain, use: () => chain, gql: () => ({ $send: mockGql }) };
      return chain;
    },
  },
}));
vi.mock("graffle/extensions/throws", () => ({ Throws: {} }));

describe.each(["characters", "motions"] as const)("%s pagination", (kind) => {
  beforeEach(() => vi.clearAllMocks());

  it.each([{ Method: "TextToMotion" }, ["Walk"], null])(
    "preserves pages and opaque cursors with tags %j",
    async (tags) => {
      const client = new UthanaClient("test-key");
      const first = {
        items: [{ id: "old", name: "Walk", org_id: "org", created: null, tags }],
        next_cursor: "opaque+/=",
      };
      const last = {
        items: [{ id: "older", name: "Walk", created: "2020-01-01" }],
        next_cursor: null,
      };
      mockGql
        .mockResolvedValueOnce({ data: { [`${kind}_paged`]: first } })
        .mockResolvedValueOnce({ data: { [`${kind}_paged`]: last } });
      const options = { query: "walk", source: "mine", order: "created_asc", limit: 1 } as const;
      expect(await client[kind].listPaged(options)).toEqual(first);
      expect(await client[kind].listPaged({ ...options, cursor: first.next_cursor })).toEqual(last);
      expect(mockGql.mock.calls[0][0]).toEqual(options);
      expect(mockGql.mock.calls[1][0]).toEqual({ ...options, cursor: "opaque+/=" });
    },
  );

  it("omits null defaults and preserves the old list return shape", async () => {
    const client = new UthanaClient("test-key");
    mockGql
      .mockResolvedValueOnce({ data: { [`${kind}_paged`]: { items: [], next_cursor: null } } })
      .mockResolvedValueOnce({ data: { [kind]: [] } });
    expect(await client[kind].listPaged({ query: null, limit: null })).toEqual({
      items: [],
      next_cursor: null,
    });
    expect(mockGql.mock.calls[0][0]).toEqual({});
    expect(await client[kind].list()).toEqual([]);
  });

  it("propagates an API cursor error without retrying", async () => {
    const client = new UthanaClient("test-key");
    mockGql.mockRejectedValue(new UthanaError(400, "Invalid page cursor", "graphql"));
    await expect(client[kind].listPaged({ cursor: "expired" })).rejects.toThrow(
      "Invalid page cursor",
    );
    expect(mockGql).toHaveBeenCalledTimes(1);
  });
});

it("passes explicit zero and empty filters through to API validation", async () => {
  mockGql.mockReset().mockRejectedValue(new UthanaError(400, "Invalid limit", "graphql"));
  const client = new UthanaClient("test-key");
  const options = { limit: 0, query: "", cursor: "", method: "" };
  await expect(client.motions.listPaged(options)).rejects.toThrow("Invalid limit");
  expect(mockGql).toHaveBeenCalledWith(options);
});
