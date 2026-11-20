import { UthanaClient } from "@uthana/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

it("fetches character identity, organization and null timestamps", async () => {
  const client = new UthanaClient("test");
  const character = { id: "c1", name: "Hero", org_id: "org", created: null, updated: null };
  mockGql.mockResolvedValue({ data: { character } });
  expect(await client.characters.get("c1")).toEqual(character);
  expect(mockGql).toHaveBeenCalledWith({ character_id: "c1" });
  expect(queries[0]).toContain("org_id created updated");
});
it("reports inaccessible or missing characters", async () => {
  mockGql.mockResolvedValue({ data: { character: null } });
  await expect(new UthanaClient("test").characters.get("c1")).rejects.toMatchObject({
    statusCode: 404,
  });
});

describe.each(["characters", "motions"] as const)("%s lifecycle", (kind) => {
  it.each(["rename", "delete", "restore"] as const)(
    "%s sends only changed fields and unwraps the record",
    async (operation) => {
      const client = new UthanaClient("test");
      const singular = kind === "characters" ? "character" : "motion";
      const record = {
        id: "asset",
        name: "Renamed",
        org_id: "org",
        created: null,
        deleted: operation === "delete" ? "2026-01-01" : null,
      };
      mockGql.mockResolvedValue({ data: { [`update_${singular}`]: { [singular]: record } } });
      const module = client[kind];
      const result =
        operation === "rename"
          ? await module.rename("asset", "Renamed")
          : await module[operation]("asset");
      expect(result).toEqual(record);
      expect(mockGql).toHaveBeenCalledWith({
        [`${singular}_id`]: "asset",
        ...(operation === "rename" ? { name: "Renamed" } : { deleted: operation === "delete" }),
      });
      expect(queries[0]).toContain(`${singular}_id: $${singular}_id`);
      expect(queries[0]).toContain(`${singular} { id name org_id created updated deleted }`);
    },
  );
  it("preserves permission failures without retry", async () => {
    const client = new UthanaClient("test");
    mockGql.mockRejectedValue(new Error("UserAccessRequired"));
    await expect(client[kind].restore("asset")).rejects.toThrow("UserAccessRequired");
    expect(mockGql).toHaveBeenCalledTimes(1);
  });
});
