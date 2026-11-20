import { UthanaClient } from "@uthana/client";
import { afterEach, expect, it, vi } from "vitest";
afterEach(() => vi.unstubAllGlobals());
it("preserves authentication when applying a per-request Graffle deadline", async () => {
  const request = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: { user: { id: "u" } } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", request);
  const client = new UthanaClient("test-key", { timeout: 1 });
  expect(await client._graphql("query Who { user { id } }")).toEqual({ user: { id: "u" } });
  const [url, init] = request.mock.calls[0];
  expect(String(url)).toBe("https://uthana.com/graphql");
  expect(new Headers(init.headers).get("Authorization")).toBe(`Basic ${btoa("test-key:")}`);
  expect(init.signal).toBeInstanceOf(AbortSignal);
});

it("recognizes real Graffle-wrapped network failures without retrying a paid mutation", async () => {
  const request = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
  vi.stubGlobal("fetch", request);
  await expect(new UthanaClient("test").motions.rename("m1", "Walk")).rejects.toMatchObject({
    kind: "uncertain",
  });
  expect(request).toHaveBeenCalledTimes(1);
});
