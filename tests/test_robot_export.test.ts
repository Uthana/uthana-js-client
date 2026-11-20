import { UthanaClient } from "@uthana/client";
import { expect, it, vi } from "vitest";

it("encodes robot path IDs and forwards timeout, FPS and response limit", async () => {
  const client = new UthanaClient("test");
  const bytes = new ArrayBuffer(3);
  const request = vi.spyOn(client, "_requestBytes").mockResolvedValue(bytes);
  expect(await client.motions.downloadRobot("c/a", "m?b", { fps: 60, maxBytes: 50 })).toBe(bytes);
  expect(request).toHaveBeenCalledWith(
    "https://uthana.com/motion/file/motion_viewer/c%2Fa/m%3Fb/csv/unitree_g1_c%2Fa-m%3Fb.csv?fps=60",
    { maxBytes: 50, timeoutSeconds: 660 },
  );
  await client.motions.downloadRobot("c", "m", { timeoutSeconds: 12 });
  expect(request).toHaveBeenLastCalledWith(
    "https://uthana.com/motion/file/motion_viewer/c/m/csv/unitree_g1_c-m.csv",
    { maxBytes: undefined, timeoutSeconds: 12 },
  );
});
it.each([0, 29, 30.1, NaN, Infinity, true, "30"])(
  "rejects invalid FPS %s before transport",
  async (fps) => {
    const client = new UthanaClient("test");
    const request = vi.spyOn(client, "_requestBytes");
    // @ts-expect-error Deliberately exercise invalid runtime input.
    await expect(client.motions.downloadRobot("c", "m", { fps })).rejects.toThrow("fps");
    expect(request).not.toHaveBeenCalled();
  },
);
it("preserves download errors and validates bounds before transport", async () => {
  const client = new UthanaClient("test");
  const failure = new Error("download failed");
  const request = vi.spyOn(client, "_requestBytes").mockRejectedValue(failure);
  await expect(client.motions.downloadRobot("c", "m")).rejects.toBe(failure);
  request.mockClear();
  await expect(client.motions.downloadRobot("c", "m", { maxBytes: NaN })).rejects.toThrow(
    "maxBytes",
  );
  await expect(client.motions.downloadRobot("c", "m", { timeoutSeconds: 0 })).rejects.toThrow(
    "timeoutSeconds",
  );
  // @ts-expect-error Unsupported robot.
  await expect(client.motions.downloadRobot("c", "m", { robot: "other" })).rejects.toThrow(
    "unitree_g1",
  );
  expect(request).not.toHaveBeenCalled();
});
