import { readFileSync } from "node:fs";
import { UthanaClient, UthanaCharacters } from "@uthana/client";
import { beforeEach, expect, it, vi } from "vitest";
const contract = JSON.parse(
  readFileSync(new URL("./fixtures/library_copy_contract.json", import.meta.url), "utf8"),
) as {
  invalid_results: unknown[];
  unknown_score_tags: unknown[];
  valid_results: {
    response: unknown;
    motion_id: string;
    name: string | null;
    match_score: number;
  }[];
};

const { mockGql, queries } = vi.hoisted(() => ({ mockGql: vi.fn(), queries: [] as string[] }));
vi.mock("graffle", () => ({
  Graffle: {
    create: () => {
      const chain = {
        transport: () => chain,
        use: () => chain,
        gql: (query: string) => {
          queries.push(query);
          return { $send: mockGql };
        },
      };
      return chain;
    },
  },
}));
vi.mock("graffle/extensions/throws", () => ({ Throws: {} }));
beforeEach(() => {
  mockGql.mockReset();
  queries.length = 0;
});
it("submits one paid best-match copy with explicit character", async () => {
  mockGql.mockResolvedValue({
    data: { create_text_to_motion: { motion: { id: "m1", name: "Walk", tags: { Distance: 0 } } } },
  });
  const result = await new UthanaClient("test").ttm.librarySearch("walk slowly", {
    character_id: "c1",
  });
  expect(result).toEqual({ character_id: "c1", motion_id: "m1", name: "Walk", match_score: 0 });
  expect(mockGql).toHaveBeenCalledWith({ prompt: "walk slowly", character_id: "c1" });
  expect(mockGql).toHaveBeenCalledTimes(1);
  expect(queries[0]).toContain('model: "nearest-neighbor"');
});
it.each([null, [], { Distance: true }, { Distance: "0.5" }, { Distance: Infinity }])(
  "keeps missing or invalid scores unknown: %j",
  async (tags) => {
    mockGql.mockResolvedValue({
      data: { create_text_to_motion: { motion: { id: "m1", name: null, tags } } },
    });
    expect(await new UthanaClient("test").ttm.librarySearch("walk")).toEqual({
      character_id: UthanaCharacters.tar,
      motion_id: "m1",
      name: null,
      match_score: null,
    });
  },
);
it.each([
  null,
  {},
  { motion: null },
  { motion: {} },
  { motion: { id: " " } },
  { motion: { id: 3 } },
])("reports uncertain paid outcomes without resubmission: %j", async (data) => {
  mockGql.mockResolvedValue({ data: { create_text_to_motion: data } });
  await expect(new UthanaClient("test").ttm.librarySearch("walk")).rejects.toMatchObject({
    kind: "uncertain",
  });
  expect(mockGql).toHaveBeenCalledTimes(1);
});

it.each(contract.invalid_results)("shared malformed-copy fixture %j", async (data) => {
  mockGql.mockResolvedValue({ data: { create_text_to_motion: data } });
  await expect(new UthanaClient("test").ttm.librarySearch("walk")).rejects.toMatchObject({
    kind: "uncertain",
  });
  expect(mockGql).toHaveBeenCalledTimes(1);
});
it.each(contract.valid_results)("shared valid-copy fixture %j", async (entry) => {
  mockGql.mockResolvedValue({ data: { create_text_to_motion: entry.response } });
  expect(await new UthanaClient("test").ttm.librarySearch("walk")).toMatchObject({
    motion_id: entry.motion_id,
    name: entry.name,
    match_score: entry.match_score,
  });
});
