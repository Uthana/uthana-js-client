import { UthanaClient } from "@uthana/client";
import { afterEach, expect, it, vi } from "vitest";
const { config, send } = vi.hoisted(() => ({
  config: [] as Array<{ raw?: { signal: AbortSignal } }>,
  send: vi.fn(),
}));
vi.mock("graffle", () => ({
  Graffle: {
    create: () => {
      const chain = {
        transport: (options: { raw?: { signal: AbortSignal } }) => {
          config.push(options);
          return chain;
        },
        use: () => chain,
        gql: () => ({ $send: send }),
      };
      return chain;
    },
  },
}));
vi.mock("graffle/extensions/throws", () => ({ Throws: {} }));
afterEach(() => {
  send.mockReset();
  config.length = 0;
});
it("applies per-call timeouts and keeps paid timeouts uncertain", async () => {
  send.mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        const signal = config.at(-1)?.raw?.signal;
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
  );
  const client = new UthanaClient("test", { timeout: 1 });
  await expect(client.motions.share("c", "m", { timeoutSeconds: 0.005 })).rejects.toMatchObject({
    kind: "uncertain",
  });
  expect(send).toHaveBeenCalledTimes(1);
  await expect(
    client._graphql("query Read { user { id } }", {}, { timeoutSeconds: 0.005 }),
  ).rejects.toMatchObject({ name: "TimeoutError" });
});
it("applies the configured default and rejects invalid timeouts before sending", async () => {
  send.mockImplementation(() => Promise.resolve({ data: {} }));
  const client = new UthanaClient("test", { timeout: 0.01 });
  await client._graphql("query Read { user { id } }");
  const signal = config.at(-1)?.raw?.signal;
  expect(signal).toBeInstanceOf(AbortSignal);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(signal?.aborted).toBe(true);
  send.mockClear();
  for (const timeoutSeconds of [0, -1, NaN, Infinity, 3e6]) {
    await expect(
      client._graphql("query Read { user { id } }", {}, { timeoutSeconds }),
    ).rejects.toThrow("timeoutSeconds");
  }
  expect(send).not.toHaveBeenCalled();
});
it("counts UTF-8 response bytes and validates ratings before transport", async () => {
  send.mockResolvedValue({ data: { name: "猫" } });
  const serialized = JSON.stringify({ data: { name: "猫" } });
  const client = new UthanaClient("test", { maxResponseBytes: serialized.length });
  await expect(client._graphql("query Read { user { id } }")).rejects.toMatchObject({
    kind: "response_too_large",
  });
  send.mockClear();
  for (const score of [-1, 2, true, NaN]) {
    // @ts-expect-error Exercise runtime input validation.
    await expect(client.motions.rate("m", score)).rejects.toThrow("score");
  }
  expect(send).not.toHaveBeenCalled();
});

it.each([
  "\uFEFF# paid request\nmutation Paid { write }",
  "fragment Fields on Query { user { id } }\nmutation Paid { write }",
])("handles comments and fragment-first documents conservatively for recovery", async (query) => {
  send.mockRejectedValue(new TypeError("fetch failed"));
  await expect(new UthanaClient("test")._graphql(query)).rejects.toMatchObject({
    kind: "uncertain",
  });
  expect(send).toHaveBeenCalledTimes(1);
});
