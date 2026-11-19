/** Path-controlled locomotion validation. */
export const SUPPORTED_CONTROLLED_CHARACTERS = [
  "cQAGzmu5SRR5",
  "cH32hVsowEyB",
  "c87BhovBvmQA",
  "cXi2eAP19XwQ",
] as const;
export const SUPPORTED_CONTROLLED_STYLES = [
  "neutral_male_a",
  "crouching",
  "zombie",
  "march",
  "rushed",
] as const;
const MAX_POINTS = 16;
const MAX_COORDINATE = 10;
const MIN_SEGMENT_LENGTH = 0.05;
const MIN_SPEED_MPS = 0.25;
const MAX_SPEED_MPS = 1.2;

export interface PathPoint {
  right: number;
  forward: number;
}
export interface PaceChange {
  path_fraction: number;
  speed_mps: number;
}
export interface ControlledLocomotionPlan {
  points: PathPoint[];
  pace_changes: PaceChange[];
  allow_slowing: true;
  units?: "metres" | "character_heights";
  style?: (typeof SUPPORTED_CONTROLLED_STYLES)[number];
}
export interface ControlledLocomotionMeasurements {
  duration_seconds: number;
  path_length_m: number;
  actual_distance_m: number;
  max_path_error_m: number;
  endpoint_error_m: number;
  final_second_drift_m: number;
  has_stopped: boolean;
}
export type ControlledLocomotionResult = {
  character_id: string;
  measurements: ControlledLocomotionMeasurements;
} & (
  | { status: "succeeded"; motion_id: string }
  | { status: "constraints_not_met"; motion_id: null }
);

function record(
  value: unknown,
  required: string[],
  optional: string[] = [],
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected a controlled locomotion object");
  }
  const keys = Object.keys(value);
  if (
    required.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) ||
    keys.some((key) => !required.includes(key) && !optional.includes(key))
  ) {
    throw new Error("Controlled locomotion object has missing or unknown fields");
  }
  return value as Record<string, unknown>;
}

function number(value: unknown, field: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${field} must be a finite number between ${minimum} and ${maximum}`);
  }
  return value;
}

/** Validate/copy a plan with explicit defaults; worker checks smoothed physical path length. */
export function normalizeControlledLocomotionPlan(value: unknown): ControlledLocomotionPlan {
  const plan = record(value, ["points", "pace_changes", "allow_slowing"], ["units", "style"]);
  const units = Object.prototype.hasOwnProperty.call(plan, "units") ? plan.units : "metres";
  const style = Object.prototype.hasOwnProperty.call(plan, "style") ? plan.style : "neutral_male_a";
  if (units !== "metres" && units !== "character_heights") {
    throw new Error("units must be metres or character_heights");
  }
  if (
    style !== "neutral_male_a" &&
    style !== "crouching" &&
    style !== "zombie" &&
    style !== "march" &&
    style !== "rushed"
  ) {
    throw new Error("style must be one of the supported controlled locomotion styles");
  }
  if (plan.allow_slowing !== true) {
    throw new Error("allow_slowing must be true; exact timing is not supported");
  }
  if (!Array.isArray(plan.points) || plan.points.length < 2 || plan.points.length > MAX_POINTS) {
    throw new Error(`points must contain 2-${MAX_POINTS} waypoints`);
  }
  const points: PathPoint[] = Array.from(plan.points, (raw) => {
    const point = record(raw, ["right", "forward"]);
    return {
      right: number(point.right, "right", -MAX_COORDINATE, MAX_COORDINATE),
      forward: number(point.forward, "forward", -MAX_COORDINATE, MAX_COORDINATE),
    };
  });
  const first = points[0];
  const second = points[1];
  if (!first || !second) {
    throw new Error("points must contain at least two waypoints");
  }
  if (first.right !== 0 || first.forward !== 0) {
    throw new Error("points must start at right=0, forward=0");
  }
  if (second.right !== 0 || second.forward <= 0) {
    throw new Error("The first segment must head forward");
  }
  let previous = first;
  for (const current of points.slice(1)) {
    if (
      Math.hypot(current.right - previous.right, current.forward - previous.forward) <
      MIN_SEGMENT_LENGTH
    ) {
      throw new Error(`Adjacent path points must be at least ${MIN_SEGMENT_LENGTH} units apart`);
    }
    previous = current;
  }
  if (
    !Array.isArray(plan.pace_changes) ||
    plan.pace_changes.length < 1 ||
    plan.pace_changes.length > MAX_POINTS
  ) {
    throw new Error(`pace_changes must contain 1-${MAX_POINTS} entries`);
  }
  const paces: PaceChange[] = [];
  for (const raw of plan.pace_changes) {
    const pace = record(raw, ["path_fraction", "speed_mps"]);
    const fraction = number(pace.path_fraction, "path_fraction", 0, 1);
    const previousPace = paces[paces.length - 1];
    if (
      fraction >= 1 ||
      (!previousPace && fraction !== 0) ||
      (previousPace && fraction <= previousPace.path_fraction)
    ) {
      throw new Error("pace_changes must start at 0 and increase strictly below 1");
    }
    paces.push({
      path_fraction: fraction,
      speed_mps: number(pace.speed_mps, "speed_mps", MIN_SPEED_MPS, MAX_SPEED_MPS),
    });
  }
  return { units, style, points, pace_changes: paces, allow_slowing: true };
}
