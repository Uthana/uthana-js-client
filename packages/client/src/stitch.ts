/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 *
 * Flat motion-step stitching and legacy sampled-pose compatibility.
 * Ordinary stitching is prepared by the service; legacy callers supply poses.
 */

import type { Motion } from "./types";

const MAX_FRAME_INDEX = 2 ** 31 - 1;
const MAX_OFFSET_METERS = 100;
const MAX_TURN_DEGREES = 180;
const MIN_TRANSITION_SECONDS = 0.1;
const MAX_TRANSITION_SECONDS = 3;
const DEFAULT_TRANSITION_SECONDS = 1;

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

/** Flat, inclusive native-source trims and outgoing transition settings. */
export interface MotionStep {
  motion_id: string;
  trim_start_frame?: number;
  trim_end_frame?: number;
  trim_start_seconds?: number;
  trim_end_seconds?: number;
  transition_duration_seconds?: number;
  transition_forward_meters?: number;
  transition_right_meters?: number;
  transition_facing_degrees?: number;
}

export interface StitchInput {
  character_id: string;
  steps: [MotionStep, MotionStep];
}

export interface ResolvedMotionStep {
  motion_id: string;
  trim_start_frame: number;
  trim_end_frame: number;
  trim_start_seconds: number;
  trim_end_seconds: number;
  transition_duration_seconds?: number;
  transition_forward_meters?: number;
  transition_right_meters?: number;
  transition_facing_degrees?: number;
}

export interface StitchResult {
  motion: Motion;
  resolved_steps: [ResolvedMotionStep, ResolvedMotionStep];
}

const allowedFields = (
  value: unknown,
  { required, allowed }: { required: readonly string[]; allowed: readonly string[] },
): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Stitch objects must be records");
  }
  const row = value as Record<string, unknown>;
  const hasMissingFields = required.some((key) => !Object.prototype.hasOwnProperty.call(row, key));
  const hasUnsupportedFields = Object.keys(row).some((key) => !allowed.includes(key));
  if (hasMissingFields || hasUnsupportedFields) {
    throw new Error("Stitch input has missing or unsupported fields");
  }
  return row;
};

function stitchId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error("Invalid stitch identifier");
  }
}

function validateMotionStep(value: unknown, { outgoing }: { outgoing: boolean }): MotionStep {
  const frameFields = ["trim_start_frame", "trim_end_frame"] as const;
  const secondFields = ["trim_start_seconds", "trim_end_seconds"] as const;
  const placementFields = [
    "transition_forward_meters",
    "transition_right_meters",
    "transition_facing_degrees",
  ] as const;
  const transitionFields = ["transition_duration_seconds", ...placementFields] as const;
  const selected = allowedFields(value, {
    required: ["motion_id"],
    allowed: ["motion_id", ...frameFields, ...secondFields, ...transitionFields],
  });
  stitchId(selected.motion_id);
  const hasFrameRange = frameFields.some((key) => key in selected);
  const hasSecondRange = secondFields.some((key) => key in selected);
  if (hasFrameRange && hasSecondRange) {
    throw new Error("Use frames or seconds within a trim, not both");
  }
  const result: MotionStep = { motion_id: selected.motion_id };
  for (const key of frameFields) {
    if (key in selected) {
      const number = finite(selected[key]);
      if (!Number.isInteger(number) || number < 0 || number > MAX_FRAME_INDEX) {
        throw new Error(`${key} must be a nonnegative GraphQL integer`);
      }
      result[key] = number;
    }
  }
  for (const key of secondFields) {
    if (key in selected) {
      const number = finite(selected[key]);
      if (number < 0) {
        throw new Error(`${key} must be nonnegative`);
      }
      result[key] = number;
    }
  }
  for (const key of transitionFields) {
    if (key in selected) {
      const number = finite(selected[key]);
      if (outgoing) {
        if (key === "transition_duration_seconds") {
          if (number < MIN_TRANSITION_SECONDS || number > MAX_TRANSITION_SECONDS) {
            throw new Error("Transition duration must be 0.1-3 seconds");
          }
        } else {
          const limit = key === "transition_facing_degrees" ? MAX_TURN_DEGREES : MAX_OFFSET_METERS;
          if (Math.abs(number) > limit) {
            throw new Error(`Invalid placement ${key}`);
          }
        }
        result[key] = number;
      }
    }
  }
  if (hasFrameRange) {
    result.trim_start_frame ??= 0;
    if (result.trim_end_frame !== undefined && result.trim_end_frame <= result.trim_start_frame) {
      throw new Error("Trim end must exceed start");
    }
  } else {
    result.trim_start_seconds ??= 0;
    if (
      result.trim_end_seconds !== undefined &&
      result.trim_end_seconds <= result.trim_start_seconds
    ) {
      throw new Error("Trim end must exceed start");
    }
  }
  if (outgoing) {
    result.transition_duration_seconds ??= DEFAULT_TRANSITION_SECONDS;
    if (placementFields.some((key) => key in selected)) {
      for (const key of placementFields) {
        result[key] ??= 0;
      }
    }
  }
  return result;
}

/** Validate and copy the flat request before any potentially paid mutation. */
export function validateStitchInput(value: unknown): StitchInput {
  const request = allowedFields(value, {
    required: ["character_id", "steps"],
    allowed: ["character_id", "steps"],
  });
  stitchId(request.character_id);
  if (!Array.isArray(request.steps) || request.steps.length !== 2) {
    throw new Error("Must include exactly two motion objects");
  }
  return {
    character_id: request.character_id,
    steps: [
      validateMotionStep(request.steps[0], { outgoing: true }),
      validateMotionStep(request.steps[1], { outgoing: false }),
    ],
  };
}
