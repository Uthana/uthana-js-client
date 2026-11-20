import { UthanaClient, UthanaError } from "@uthana/client";
import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";
const contract: {
  ratings: Array<{ input: "like" | "dislike" | 0 | 1; score: number }>;
  invalid_ratings: unknown[];
  invalid_favorites: unknown[];
  invalid_clear_results: unknown[];
} = JSON.parse(
  readFileSync(new URL("./fixtures/motion_feedback_contract.json", import.meta.url), "utf8"),
);
const { send, queries } = vi.hoisted(() => ({ send: vi.fn(), queries: [] as string[] }));
vi.mock("graffle", () => ({
  Graffle: {
    create: () => {
      const chain = {
        transport: () => chain,
        use: () => chain,
        gql: (query: string) => {
          queries.push(query);
          return { $send: send };
        },
      };
      return chain;
    },
  },
}));
vi.mock("graffle/extensions/throws", () => ({ Throws: {} }));
beforeEach(() => {
  send.mockReset();
  queries.length = 0;
});
it.each(contract.ratings)(
  "normalizes readable and numeric votes: $input",
  async ({ input, score }) => {
    send.mockResolvedValue({ data: { rate_motion: {} } });
    await new UthanaClient("test").motions.rate("m1", input, { label_id: "annotation" });
    expect(send).toHaveBeenCalledWith({ motion_id: "m1", score, label_id: "annotation" });
    expect(send).toHaveBeenCalledTimes(1);
  },
);
it.each([...contract.invalid_ratings, undefined, NaN, Infinity])(
  "rejects invalid votes before transport: %s",
  async (score) => {
    // @ts-expect-error Runtime validation of untrusted input.
    await expect(new UthanaClient("test").motions.rate("m1", score)).rejects.toThrow("score");
    expect(send).not.toHaveBeenCalled();
  },
);
it("clears votes and sets favorite states explicitly without toggling", async () => {
  send.mockResolvedValue({
    data: { clear_motion_rating: { ok: true }, favorite_motion: { __typename: "FavoriteMotion" } },
  });
  const client = new UthanaClient("test");
  await client.motions.rate("m1", null);
  await client.motions.rate("m1", null);
  await client.motions.favorite("m1");
  await client.motions.favorite("m1");
  await client.motions.unfavorite("m1");
  await client.motions.favorite("m1", false);
  expect(send.mock.calls.map(([variables]) => variables)).toEqual([
    { motion_id: "m1" },
    { motion_id: "m1" },
    { motion_id: "m1", favorite: true },
    { motion_id: "m1", favorite: true },
    { motion_id: "m1", favorite: false },
    { motion_id: "m1", favorite: false },
  ]);
  expect(queries.slice(0, 2).every((query) => query.includes("clear_motion_rating("))).toBe(true);
  expect(
    queries
      .slice(2)
      .every((query) => query.includes("favorite_motion(") && !query.includes("motion_favorite {")),
  ).toBe(true);
});
it.each(contract.invalid_clear_results)(
  "leaves missing confirmation uncertain: %s",
  async (result) => {
    send.mockResolvedValue({ data: { clear_motion_rating: result } });
    await expect(new UthanaClient("test").motions.rate("m1", null)).rejects.toMatchObject({
      kind: "uncertain",
    });
    expect(send).toHaveBeenCalledTimes(1);
  },
);
it("rejects annotation clears and preserves definitive errors without fallback", async () => {
  const client = new UthanaClient("test");
  await expect(client.motions.rate("m1", null, { label_id: "annotation" })).rejects.toThrow(
    "whole motion",
  );
  expect(send).not.toHaveBeenCalled();
  const failure = new UthanaError(400, "Unknown clear_motion_rating field", "graphql");
  send.mockRejectedValue(failure);
  await expect(client.motions.rate("m1", null)).rejects.toBe(failure);
  expect(send).toHaveBeenCalledTimes(1);
});

it.each(contract.invalid_favorites)(
  "rejects non-boolean favorite states before writing: %s",
  async (favorite) => {
    // @ts-expect-error Exercise untrusted runtime input.
    await expect(new UthanaClient("test").motions.favorite("m1", favorite)).rejects.toThrow(
      "Favorite state",
    );
    expect(send).not.toHaveBeenCalled();
  },
);
