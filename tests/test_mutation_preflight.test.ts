import { UthanaClient } from "@uthana/client";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

it("preserves serialization failures before sending a mutation", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  for (const value of [1n, circular]) {
    await expect(
      new UthanaClient("test")._graphql(
        'mutation Rename($value: String!) { update_motion(motion_id: "m1", name: $value) { __typename } }',
        { value },
      ),
    ).rejects.toMatchObject({ cause: expect.any(TypeError) });
    expect(request).not.toHaveBeenCalled();
  }
});

it("keeps a malformed response uncertain after a mutation was sent", async () => {
  const request = vi.fn().mockResolvedValue(new Response("not-json"));
  vi.stubGlobal("fetch", request);
  await expect(new UthanaClient("test").motions.rename("m1", "Walk")).rejects.toMatchObject({
    kind: "uncertain",
  });
  expect(request).toHaveBeenCalledTimes(1);
});
