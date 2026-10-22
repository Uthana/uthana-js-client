/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 *
 * Shared typed-step stitching and legacy sampled-pose compatibility.
 * Ordinary stitching is prepared by the service; legacy callers supply poses.
 */

import type { Motion } from "./types";

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

/** Inclusive native-source sample ranges. Do not mix frame and second fields. */
export type StitchRange =
  | { start_frame?: number; end_frame?: number; start_seconds?: never; end_seconds?: never }
  | { start_seconds?: number; end_seconds?: number; start_frame?: never; end_frame?: never };

export interface StitchPlacement {
  forward_m?: number;
  right_m?: number;
  turn_degrees?: number;
  absolute?: false;
}

export interface MotionStep {
  type: "motion";
  motion_id: string;
  range?: StitchRange;
  placement?: StitchPlacement;
}

export interface TransitionStep {
  type: "transition";
  duration_seconds?: number;
}

export interface StitchInput {
  character_id: string;
  steps: [MotionStep, TransitionStep, MotionStep];
}

export interface ResolvedMotionStep {
  type: "motion";
  motion_id: string;
  range: { start_frame: number; end_frame: number; start_seconds: number; end_seconds: number };
  placement?: StitchPlacement | { mode: "automatic" };
}

export interface StitchResult {
  motion: Motion;
  resolved_steps: [ResolvedMotionStep, Required<TransitionStep>, ResolvedMotionStep];
}

const allowedFields = (
  value: unknown,
  { required, allowed }: { required: readonly string[]; allowed: readonly string[] },
): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Stitch objects must be records");
  }
  const row = value as Record<string, unknown>;
  const missingFields = required.some((key) => !Object.prototype.hasOwnProperty.call(row, key));
  const unsupportedFields = Object.keys(row).some((key) => !allowed.includes(key));
  if (missingFields || unsupportedFields) {
    throw new Error("Stitch input has missing or unsupported fields");
  }
  return row;
};

function stitchId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error("Invalid stitch identifier");
  }
}

function validateRange(value: unknown): asserts value is StitchRange {
  const selected = allowedFields(value, {
    required: [],
    allowed: ["start_frame", "end_frame", "start_seconds", "end_seconds"],
  });
  const hasFrameRange = "start_frame" in selected || "end_frame" in selected;
  const hasSecondRange = "start_seconds" in selected || "end_seconds" in selected;
  if (hasFrameRange && hasSecondRange) {
    throw new Error("Use frames or seconds within a range, not both");
  }
  for (const [key, value] of Object.entries(selected)) {
    const number = finite(value);
    const isInvalidFrame = key.endsWith("_frame") && !Number.isSafeInteger(number);
    if (number < 0 || isInvalidFrame) {
      throw new Error("Invalid source range");
    }
  }
  const unit = hasFrameRange ? "frame" : "seconds";
  const start = (selected[`start_${unit}`] as number | undefined) ?? 0;
  const end = selected[`end_${unit}`] as number | undefined;
  if (end !== undefined && end <= start) {
    throw new Error("Range end must exceed start");
  }
}

function validatePlacement(value: unknown): StitchPlacement {
  const selected = allowedFields(value, {
    required: [],
    allowed: ["forward_m", "right_m", "turn_degrees", "absolute"],
  });
  if ("absolute" in selected && selected.absolute !== false) {
    throw new Error("Absolute placement is unsupported");
  }
  const result: StitchPlacement = { absolute: false };
  for (const key of ["forward_m", "right_m", "turn_degrees"] as const) {
    const number = finite(key in selected ? selected[key] : 0);
    const limit = key === "turn_degrees" ? MAX_TURN_DEGREES : MAX_OFFSET_METERS;
    if (Math.abs(number) > limit) {
      throw new Error(`Invalid placement ${key}`);
    }
    result[key] = number;
  }
  return result;
}

function validateMotionStep(value: unknown, { arriving }: { arriving: boolean }): MotionStep {
  const selected = allowedFields(value, {
    required: ["type", "motion_id"],
    allowed: ["type", "motion_id", "range", "placement"],
  });
  if (selected.type !== "motion") {
    throw new Error("Supported sequence is motion, transition, motion");
  }
  stitchId(selected.motion_id);
  const range = "range" in selected ? selected.range : {};
  validateRange(range);
  const result: MotionStep = { type: "motion", motion_id: selected.motion_id, range: { ...range } };
  if ("placement" in selected) {
    if (!arriving) {
      throw new Error("Placement is supported only on the arriving motion");
    }
    result.placement = validatePlacement(selected.placement);
  }
  return result;
}

function validateTransitionStep(value: unknown): Required<TransitionStep> {
  const selected = allowedFields(value, {
    required: ["type"],
    allowed: ["type", "duration_seconds"],
  });
  if (selected.type !== "transition") {
    throw new Error("Supported sequence is motion, transition, motion");
  }
  const duration = finite(
    "duration_seconds" in selected ? selected.duration_seconds : DEFAULT_TRANSITION_SECONDS,
  );
  if (duration < MIN_TRANSITION_SECONDS || duration > MAX_TRANSITION_SECONDS) {
    throw new Error("Invalid transition duration");
  }
  return { type: "transition", duration_seconds: duration };
}

/** Validate and copy the shared request before any potentially paid mutation. */
export function validateStitchInput(value: unknown): StitchInput {
  const request = allowedFields(value, {
    required: ["character_id", "steps"],
    allowed: ["character_id", "steps"],
  });
  stitchId(request.character_id);
  if (!Array.isArray(request.steps) || request.steps.length !== 3) {
    throw new Error("Supported sequence is motion, transition, motion");
  }
  return {
    character_id: request.character_id,
    steps: [
      validateMotionStep(request.steps[0], { arriving: false }),
      validateTransitionStep(request.steps[1]),
      validateMotionStep(request.steps[2], { arriving: true }),
    ],
  };
}
