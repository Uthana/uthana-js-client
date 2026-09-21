/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { describe, expect, it } from "vitest";
import { type StitchParams, validateStitchParams } from "../packages/client/src/stitch";

const unit = { x: 0, y: 0, z: 0, w: 1 };
const origin = { x: 0, y: 0, z: 0 };
const pelvis = {
  pelvis_world_pos: origin,
  pelvis_world_rot: unit,
  hips_forward_facing_world_yaw: 0,
};

const valid: StitchParams = {
  prompt: "walk",
  motion_id: "m1",
  stitch_loop: false,
  stitch_duration: 0.5,
  motion_duration: 2,
  motion_lower_trim_time: 0.2,
  motion_upper_trim_time: 1.8,
  motion_lower_trim_fraction: 0.1,
  motion_upper_trim_fraction: 0.9,
  root_node_world_pos: origin,
  root_node_world_rot: unit,
  at_zero_time: pelvis,
  at_lower_trim_time: pelvis,
  at_upper_trim_time: pelvis,
};

describe("validateStitchParams", () => {
  it("accepts a valid stitch clip", () => {
    const copy = validateStitchParams(valid);
    expect(copy.motion_id).toBe("m1");
    expect(copy).not.toBe(valid);
  });

  it("rejects mismatched trim fractions", () => {
    expect(() => validateStitchParams({ ...valid, motion_lower_trim_fraction: 0.5 })).toThrow(
      /trim fractions/i,
    );
  });

  it("rejects non-unit quaternions", () => {
    expect(() =>
      validateStitchParams({
        ...valid,
        root_node_world_rot: { x: 1, y: 1, z: 1, w: 1 },
      }),
    ).toThrow(/unit quaternion/i);
  });

  it("rejects empty motion_id", () => {
    expect(() => validateStitchParams({ ...valid, motion_id: "  " })).toThrow(/motion_id/);
  });
});
