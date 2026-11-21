import { UthanaClient } from "@uthana/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-20T00:00:00Z"));
  mockGql.mockReset();
  queries.length = 0;
});

afterEach(() => vi.useRealTimers());

it("keeps decimal USD, zero and nullable references while paging", async () => {
  const client = new UthanaClient("test");
  const rows = [
    {
      id: "entry1",
      total_usd: "0.00",
      balance_before: null,
      balance_after: "0.00",
      quantity: 0,
      job_id: "m1",
      task_id: "j1",
      ref: "motion:m1",
    },
  ];
  mockGql.mockResolvedValue({ data: { payg_ledger: rows } });
  const since = new Date("2026-11-18T00:00:00Z");
  const options = { limit: 1, since, until: "2026-11-19T00:00:00Z", types: ["debit"] };
  expect(await client.org.getLedger(options)).toEqual(rows);
  await client.org.getLedger({ ...options, beforeId: rows[0].id });
  expect(mockGql.mock.calls[0][0]).toEqual({
    limit: 1,
    since: "2026-11-18T00:00:00.000Z",
    until: "2026-11-19T00:00:00Z",
    types: ["debit"],
  });
  expect(mockGql.mock.calls[1][0].before_id).toBe("entry1");
  expect(queries[0]).toContain("$types: [String!]");
  expect(options.since).toBe(since);
  expect(options.types).toEqual(["debit"]);
});
it("bounds default and null filters to the last seven days", async () => {
  mockGql.mockResolvedValue({ data: { payg_ledger: [] } });
  expect(
    await new UthanaClient("test").org.getLedger({ since: null, types: null, beforeId: null }),
  ).toEqual([]);
  expect(mockGql).toHaveBeenCalledWith({
    limit: 50,
    since: "2026-11-13T00:00:00.000Z",
    until: "2026-11-20T00:00:00.000Z",
  });
  expect(queries[0]).toContain("$since: DateTime");
  expect(queries[0]).not.toContain("$before_id");
  expect(queries[0]).not.toContain("$types");
});
it("preserves an explicit empty type selection", async () => {
  mockGql.mockResolvedValue({ data: { payg_ledger: [] } });
  await new UthanaClient("test").org.getLedger({ types: [] });
  expect(mockGql).toHaveBeenCalledWith({
    limit: 50,
    types: [],
    since: "2026-11-13T00:00:00.000Z",
    until: "2026-11-20T00:00:00.000Z",
  });
});
it.each([0, 501, 1.5, NaN, Infinity])(
  "rejects invalid limit %s before transport",
  async (limit) => {
    await expect(new UthanaClient("test").org.getLedger({ limit })).rejects.toThrow("limit");
    expect(mockGql).not.toHaveBeenCalled();
  },
);
it.each(["bad", "2026-02-30T00:00:00Z", "2026-13-01", ""])(
  "rejects invalid time %s",
  async (since) => {
    await expect(new UthanaClient("test").org.getLedger({ since })).rejects.toThrow("since");
    expect(mockGql).not.toHaveBeenCalled();
  },
);
it("rejects invalid Date, entry ID and type names without a call", async () => {
  const client = new UthanaClient("test");
  await expect(client.org.getLedger({ since: new Date(NaN) })).rejects.toThrow("since");
  await expect(client.org.getLedger({ beforeId: "" })).rejects.toThrow("beforeId");
  await expect(client.org.getLedger({ types: [""] })).rejects.toThrow("types");
  expect(mockGql).not.toHaveBeenCalled();
});
it("propagates authorization failures without retry", async () => {
  mockGql.mockRejectedValue(new Error("RoleRequired"));
  await expect(new UthanaClient("test").org.getLedger()).rejects.toThrow("RoleRequired");
  expect(mockGql).toHaveBeenCalledTimes(1);
});

it.each([
  null,
  {},
  "bad",
  [null],
  [{ id: "entry", total_usd: 0 }],
  [{ id: "entry", total_usd: "free" }],
  [{ id: "entry", quantity: "0" }],
  [{ id: "entry", quantity: Infinity }],
  [{ id: null }],
  [{ id: "entry", balance_after: false }],
])("rejects malformed financial response %j", async (rows) => {
  mockGql.mockResolvedValue({ data: { payg_ledger: rows } });
  await expect(new UthanaClient("test").org.getLedger()).rejects.toMatchObject({
    statusCode: 502,
    kind: "invalid_response",
  });
  expect(mockGql).toHaveBeenCalledTimes(1);
});
it("returns an owned validated record without mutating the input", async () => {
  const row = {
    id: "entry",
    total_usd: "1E-8",
    balance_after: null,
    quantity: 0,
    private_extra: "ignored",
  };
  mockGql.mockResolvedValue({ data: { payg_ledger: [row] } });
  const entries = await new UthanaClient("test").org.getLedger();
  expect(entries[0]).toEqual({ id: "entry", total_usd: "1E-8", balance_after: null, quantity: 0 });
  expect(entries[0]).not.toBe(row);
  expect(row.private_extra).toBe("ignored");
});

it.each([
  { until: "2026-11-12T23:59:59.999Z" },
  { until: "2026-11-20T00:00:00.001Z" },
  { since: "2026-11-20T00:00:00.001Z" },
  { since: "2026-11-19T00:00:00Z", until: "2026-11-19T00:00:00Z" },
  { since: "2026-11-19T00:00:00Z", until: "2026-11-18T00:00:00Z" },
])("rejects dates outside the recent window or reversed bounds: %j", async (options) => {
  await expect(new UthanaClient("test").org.getLedger(options)).rejects.toThrow();
  expect(mockGql).not.toHaveBeenCalled();
});
it("retains the seven-day bound when paging with an old entry ID", async () => {
  mockGql.mockResolvedValue({ data: { payg_ledger: [] } });
  await new UthanaClient("test").org.getLedger({
    beforeId: "old-entry",
    since: "2026-11-13T00:00:00Z",
  });
  expect(mockGql.mock.calls[0][0]).toMatchObject({
    before_id: "old-entry",
    since: "2026-11-13T00:00:00Z",
    until: "2026-11-20T00:00:00.000Z",
  });
});

it.each([false, true])(
  "accepts precomputed date bounds and preserves until (paging=%s)",
  async (isPaging) => {
    mockGql.mockResolvedValue({ data: { payg_ledger: [] } });
    const client = new UthanaClient("test");
    await client.org.getLedger();
    const first = mockGql.mock.calls[0][0];
    for (const elapsedMs of [1, 3000, 600000]) {
      vi.setSystemTime(new Date(Date.parse(first.until) + elapsedMs));
      const options = {
        since: first.since,
        until: first.until,
        ...(isPaging ? { beforeId: "entry1" } : {}),
      };
      await client.org.getLedger(options);
      const sent = mockGql.mock.calls.at(-1)![0];
      expect(sent.since).toBe(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      expect(sent.until).toBe(first.until);
      expect(sent.before_id).toBe(isPaging ? "entry1" : undefined);
      expect(options.since).toBe(first.since);
    }
    expect(mockGql).toHaveBeenCalledTimes(4);
  },
);

it.each([undefined, "old-entry"])(
  "clamps old starts without expanding history (beforeId=%s)",
  async (beforeId) => {
    mockGql.mockResolvedValue({ data: { payg_ledger: [] } });
    await new UthanaClient("test").org.getLedger({ since: "2000-01-01", beforeId });
    expect(mockGql.mock.calls[0][0].since).toBe("2026-11-13T00:00:00.000Z");
  },
);
