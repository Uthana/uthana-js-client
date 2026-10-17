import { describe, expect, it, vi } from "vitest";
import { validateAutoStitchInput, type AutoStitchInput } from "../packages/client/src/stitch";
import { MotionsModule } from "../packages/client/src/modules/motions";
import type { UthanaClient } from "../packages/client/src/client";

const options: AutoStitchInput = {
  character_id: "c1",
  prefix_motion_id: "m1",
  suffix_motion_id: "m2",
};
describe("automatic stitch", () => {
  it("preserves explicit zero and does not mutate placement", () => {
    const input = { ...options, placement: { forward_m: 0, right_m: 1, facing_degrees: 90 } };
    const result = validateAutoStitchInput(input);
    expect(result).toEqual(input);
    expect(result.placement).not.toBe(input.placement);
  });
  it.each([
    { stitch_duration: true },
    { stitch_duration: Infinity },
    { placement: { forward_m: 101 } },
    { placement: { facing_degrees: 181 } },
    { placement: { forward_m: "2" } },
    { prefix_start_seconds: 2, prefix_end_seconds: 1 },
    { placement: null },
    { extra: 1 },
  ])("rejects bad input %j", (bad) => {
    expect(() =>
      validateAutoStitchInput({ ...options, ...bad } as unknown as AutoStitchInput),
    ).toThrow();
  });
  it("sends only automatic input with long timeout and keeps preparation", async () => {
    const _graphql = vi.fn().mockResolvedValue({
      motion: { id: "m3" },
      preparation: { pose_samples_source: "server_sampled" },
    });
    const motions = new MotionsModule({ _graphql } as unknown as UthanaClient);
    const result = await motions.stitchMotions(options);
    expect(result.motion.id).toBe("m3");
    expect(_graphql).toHaveBeenCalledWith(
      expect.stringContaining("AutomaticStitchInput"),
      { auto_input: options },
      { path: "create_enhanced_stitched_motion", timeoutSeconds: 360 },
    );
  });
  it("treats missing ID as uncertain and does not retry", async () => {
    const _graphql = vi.fn().mockResolvedValue({ motion: null });
    const motions = new MotionsModule({ _graphql } as unknown as UthanaClient);
    await expect(motions.stitchMotions(options)).rejects.toMatchObject({ kind: "uncertain" });
    expect(_graphql).toHaveBeenCalledTimes(1);
  });
});
