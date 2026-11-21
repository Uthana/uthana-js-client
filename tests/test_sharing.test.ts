import { UthanaClient } from "@uthana/client";
import { expect, it, vi } from "vitest";

it("publishes one link, encodes IDs and preserves playback precision", async () => {
  const client = new UthanaClient("test");
  const request = vi
    .spyOn(client, "_graphql")
    .mockResolvedValue({ png_url: "https://example.com/image.png" });
  expect(await client.motions.share("c/a", "m?b", { start: 0.123456, end: 0.987654 })).toEqual({
    character_id: "c/a",
    motion_id: "m?b",
    start: 0.123456,
    end: 0.987654,
    preview_url: "https://uthana.com/app/preview/c%2Fa/m%3Fb?start=0.123456&end=0.987654",
    png_url: "https://example.com/image.png",
  });
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining("create_share_link"),
    {
      character_id: "c/a",
      motion_id: "m?b",
      start: 0.123456,
      end: 0.987654,
      fps: 10,
      wd: 300,
      ht: 157,
    },
    { path: "create_share_link", timeoutSeconds: undefined },
  );
  expect((await client.motions.share("c", "m")).preview_url).toBe(
    "https://uthana.com/app/preview/c/m",
  );
});
it.each([
  [0, 0],
  [1, 0],
  [-1, 1],
  [0, 2],
  [NaN, 1],
  [0, Infinity],
  [false, 1],
  ["0", 1],
])("rejects invalid share window %s:%s before transport", async (start, end) => {
  const client = new UthanaClient("test");
  const request = vi.spyOn(client, "_graphql");
  // @ts-expect-error Exercise runtime validation.
  await expect(client.motions.share("c", "m", { start, end })).rejects.toThrow("Share fractions");
  expect(request).not.toHaveBeenCalled();
});
it.each([null, {}, { png_url: null }, { png_url: " " }, { png_url: 1 }])(
  "preserves uncertain publication when preview URL is missing: %s",
  async (payload) => {
    const client = new UthanaClient("test");
    const request = vi.spyOn(client, "_graphql").mockResolvedValue(payload);
    await expect(client.motions.share("c", "m")).rejects.toMatchObject({ kind: "uncertain" });
    expect(request).toHaveBeenCalledTimes(1);
  },
);
