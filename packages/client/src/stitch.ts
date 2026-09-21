/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 *
 * Typed sampled-pose inputs for the enhanced stitch preview API.
 * Sampling and spatial placement belong to the caller's motion loader.
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface PelvisState {
  pelvis_world_pos: Vector3;
  pelvis_world_rot: Quaternion;
  hips_forward_facing_world_yaw: number;
}

export interface StitchParams {
  prompt: string;
  motion_id: string;
  stitch_loop: boolean;
  stitch_duration: number;
  motion_duration: number;
  motion_lower_trim_time: number;
  motion_upper_trim_time: number;
  motion_lower_trim_fraction: number;
  motion_upper_trim_fraction: number;
  root_node_world_pos: Vector3;
  root_node_world_rot: Quaternion;
  at_zero_time: PelvisState;
  at_lower_trim_time: PelvisState;
  at_upper_trim_time: PelvisState;
}

const STITCH_KEYS = [
  "prompt",
  "motion_id",
  "stitch_loop",
  "stitch_duration",
  "motion_duration",
  "motion_lower_trim_time",
  "motion_upper_trim_time",
  "motion_lower_trim_fraction",
  "motion_upper_trim_fraction",
  "root_node_world_pos",
  "root_node_world_rot",
  "at_zero_time",
  "at_lower_trim_time",
  "at_upper_trim_time",
] as const;

const PELVIS_KEYS = [
  "pelvis_world_pos",
  "pelvis_world_rot",
  "hips_forward_facing_world_yaw",
] as const;

const finite = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Stitch values must be finite numbers, not booleans or strings");
  }
  return value;
};

const fields = (value: unknown, required: readonly string[]): Record<string, unknown> => {
  if (
    value == null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value as object).length !== required.length ||
    !required.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  ) {
    throw new Error("Stitch input has missing or unsupported fields");
  }
  return value as Record<string, unknown>;
};

const vector = (value: unknown, quaternion = false): void => {
  const keys = quaternion ? (["x", "y", "z", "w"] as const) : (["x", "y", "z"] as const);
  const obj = fields(value, keys);
  for (const key of keys) finite(obj[key]);
  if (quaternion) {
    const x = obj.x as number;
    const y = obj.y as number;
    const z = obj.z as number;
    const w = obj.w as number;
    const mag = Math.hypot(x, y, z, w);
    if (Math.abs(mag - 1) > 1e-3) {
      throw new Error("Stitch rotations must be unit quaternions in x/y/z/w order");
    }
  }
};

/** Validate and copy a full API clip input before a potentially paid mutation. */
export const validateStitchParams = (params: StitchParams): StitchParams => {
  fields(params, STITCH_KEYS);
  if (typeof params.motion_id !== "string" || !params.motion_id.trim()) {
    throw new Error("Each stitch clip needs a motion_id");
  }
  if (typeof params.prompt !== "string" || typeof params.stitch_loop !== "boolean") {
    throw new Error("Stitch prompt must be text and stitch_loop must be boolean");
  }
  const duration = finite(params.motion_duration);
  const start = finite(params.motion_lower_trim_time);
  const end = finite(params.motion_upper_trim_time);
  const lower = finite(params.motion_lower_trim_fraction);
  const upper = finite(params.motion_upper_trim_fraction);
  if (
    duration <= 0 ||
    !(0 <= start && start < end && end <= duration) ||
    finite(params.stitch_duration) <= 0
  ) {
    throw new Error(
      "Stitch trims need 0 <= start < end <= duration and positive transition duration",
    );
  }
  const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-8, 1e-7 * Math.abs(b));
  if (
    !(0 <= lower && lower < upper && upper <= 1) ||
    !close(lower, start / duration) ||
    !close(upper, end / duration)
  ) {
    throw new Error("Stitch trim fractions must agree with times divided by motion duration");
  }
  vector(params.root_node_world_pos);
  vector(params.root_node_world_rot, true);
  for (const key of ["at_zero_time", "at_lower_trim_time", "at_upper_trim_time"] as const) {
    const pose = fields(params[key], PELVIS_KEYS);
    vector(pose.pelvis_world_pos);
    vector(pose.pelvis_world_rot, true);
    finite(pose.hips_forward_facing_world_yaw);
  }
  return structuredClone(params);
};
