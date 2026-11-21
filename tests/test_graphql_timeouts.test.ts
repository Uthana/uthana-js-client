import { UthanaClient } from "@uthana/client";
import { afterEach, expect, it, vi } from "vitest";
const timeoutDescriptor = Object.getOwnPropertyDescriptor(AbortSignal, "timeout")!;
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
  Object.defineProperty(AbortSignal, "timeout", timeoutDescriptor);
  vi.restoreAllMocks();
  vi.useRealTimers();
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

it("supports browsers without AbortSignal.timeout and clears fallback timers", async () => {
  vi.useFakeTimers();
  Object.defineProperty(AbortSignal, "timeout", { ...timeoutDescriptor, value: undefined });
  send.mockResolvedValue({ data: { user: { id: "u1" } } });
  const client = new UthanaClient("test");
  await expect(client._graphql("query Read { user { id } }")).resolves.toEqual({
    user: { id: "u1" },
  });
  expect(vi.getTimerCount()).toBe(0);
  send.mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        const signal = config.at(-1)?.raw?.signal;
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
  );
  const pending = client._graphql(
    "mutation Change { update_motion { __typename } }",
    {},
    { timeoutSeconds: 0.005 },
  );
  const rejected = expect(pending).rejects.toMatchObject({ kind: "uncertain" });
  await vi.advanceTimersByTimeAsync(5);
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});
