/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import { UthanaError } from "../errors";
import {
  CREATE_SHARE_LINK,
  CREATE_ENHANCED_STITCHED_MOTION,
  STITCH,
  CREATE_LOCOMOTION,
  CREATE_LOOPED_MOTION,
  CREATE_MOTION_FAVORITE,
  CREATE_MOTION_FROM_GLTF,
  DELETE_MOTION_FAVORITE,
  GET_MOTION_BY_ID,
  LIST_LOCOMOTION_STYLES,
  LIST_MOTIONS,
  LIST_MOTIONS_PAGED,
  MOTION_CATALOG,
  MOTION_DOWNLOAD_ALLOWED,
  RATE_MOTION,
  TRIM_MOTION,
  UPDATE_MOTION,
} from "../graphql";
import {
  type StitchInput,
  validateStitchInput,
  type StitchParams,
  type StitchResult,
  validateStitchParams,
} from "../stitch";
import type {
  CreateLocomotionOptions,
  DownloadAllowed,
  Motion,
  MotionPage,
  MotionPageOptions,
  MotionCatalog,
  OutputFormat,
  RobotFormat,
  ShareLink,
  TextToMotionResult,
} from "../types";
import { UthanaCharacters } from "../types";
import { validateAssetPageLimit } from "../utils";
import { BaseModule } from "./base";

const SHARE_IMAGE_FPS = 10;
const SHARE_IMAGE_WIDTH_PX = 300;
const SHARE_IMAGE_HEIGHT_PX = 157;

const ROBOT_DOWNLOAD_TIMEOUT_SECONDS = 660;
const ROBOT_DOWNLOAD_FPS = [24, 30, 60];

/** Motion management: list, download, delete, rename, favorite, stitch, loop. */
export class MotionsModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** List all motions for the authenticated user. */
  async list(): Promise<Motion[]> {
    return this._client._graphql<Motion[]>(LIST_MOTIONS, {}, { path: "motions", pathDefault: [] });
  }

  /** Search saved names with server-side ordering and opaque cursor pagination. */
  async listPaged(options: MotionPageOptions = {}): Promise<MotionPage> {
    validateAssetPageLimit(options.limit);
    const variables = Object.fromEntries(
      Object.entries(options).filter(([, value]) => value != null),
    );
    return this._client._graphql<MotionPage>(LIST_MOTIONS_PAGED, variables, {
      path: "motions_paged",
    });
  }

  /** Get a motion and its asset metadata. Throws 404 if missing. */
  async get(motion_id: string): Promise<Motion> {
    const motion = await this._client._graphql<Motion | null>(
      GET_MOTION_BY_ID,
      { motionId: motion_id },
      { path: "motion", pathDefault: null },
    );
    if (!motion) {
      throw new UthanaError(404, "Motion not found", "http");
    }
    return motion;
  }

  /** Motion-viewer catalog with tags and owning organization IDs. */
  async catalog(): Promise<MotionCatalog> {
    return this._client._graphql<MotionCatalog>(MOTION_CATALOG);
  }

  /** Create a trimmed motion from normalized start/end fractions (no looping). */
  async trim(motionId: string, start: number, end: number, name: string): Promise<Motion> {
    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      !(0 <= start && start < end && end <= 1)
    ) {
      throw new Error("Trim fractions must be finite and satisfy 0 <= start < end <= 1");
    }
    return this._client._graphql<Motion>(
      TRIM_MOTION,
      { motion_id: motionId, start, end, name },
      { path: "trim_and_loop_motion.motion" },
    );
  }

  /** Stitch two motion objects with an optional outgoing transition with server preparation.
   * Requires stitch(input: StitchInput!) support. No automatic retries of uncertain requests.
   */
  async stitch(options: StitchInput, timeoutSeconds = 360): Promise<StitchResult> {
    const result = await this._client._graphql<StitchResult>(
      STITCH,
      { input: validateStitchInput(options) },
      { path: "stitch", timeoutSeconds },
    );
    const isValidMotion =
      typeof result?.motion?.id === "string" && Boolean(result.motion.id.trim());
    const hasValidResolvedSteps =
      Array.isArray(result?.resolved_steps) && result.resolved_steps.length === 2;
    if (!isValidMotion) {
      throw new UthanaError(
        200,
        "Stitch returned an invalid motion: expected a motion object with a nonempty id",
        "uncertain",
      );
    }
    if (!hasValidResolvedSteps) {
      throw new UthanaError(
        200,
        "Stitch result must include exactly two resolved steps: two motion objects",
        "uncertain",
      );
    }
    return result;
  }

  /**
   * Join two sampled clips through the enhanced stitch preview API.
   * Default timeout 360s. Missing motion ID raises kind="uncertain".
   */
  async createStitchedMotion(
    characterId: string,
    prefix: StitchParams,
    suffix: StitchParams,
    { timeoutSeconds = 360 }: { timeoutSeconds?: number } = {},
  ): Promise<Motion> {
    if (typeof characterId !== "string" || !characterId.trim()) {
      throw new Error("characterId is required");
    }
    const motion = await this._client._graphql<Motion | null>(
      CREATE_ENHANCED_STITCHED_MOTION,
      {
        stitch_input: {
          character_id: characterId,
          prefix: validateStitchParams(prefix),
          suffix: validateStitchParams(suffix),
        },
      },
      {
        path: "create_enhanced_stitched_motion.motion",
        timeoutSeconds,
      },
    );
    if (!motion || typeof motion.id !== "string" || !motion.id.trim()) {
      throw new UthanaError(
        502,
        "The operation returned no motion ID and may have succeeded. Inspect existing work before resubmitting.",
        "uncertain",
      );
    }
    return motion;
  }

  /**
   * Create a looped motion through the simplified preview API.
   * Default timeout 360s. Missing motion ID raises kind="uncertain".
   */
  async createLoopedMotion(
    characterId: string,
    motionId: string,
    {
      timeoutSeconds = 360,
      ...options
    }: {
      trimStartPct?: number;
      trimEndPct?: number;
      zoneDuration?: number;
      loopMode?: "closed" | "open";
      zoneMode?: "modify" | "extend";
      zoneEndPosition?: { x: number; y: number; facingAngle?: number } | null;
      timeoutSeconds?: number;
    } = {},
  ): Promise<Motion> {
    const trimStartPct = options?.trimStartPct ?? 0;
    const trimEndPct = options?.trimEndPct ?? 1;
    const zoneDuration = options?.zoneDuration ?? 2;
    const loopMode = options?.loopMode ?? "closed";
    const zoneMode = options?.zoneMode ?? "modify";
    const zoneEndPosition = options?.zoneEndPosition ?? null;

    const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

    if (
      typeof characterId !== "string" ||
      !characterId.trim() ||
      typeof motionId !== "string" ||
      !motionId.trim()
    ) {
      throw new Error("characterId and motionId are required");
    }
    if (!finite(trimStartPct) || !finite(trimEndPct) || !finite(zoneDuration)) {
      throw new Error("Trim fractions and zoneDuration must be finite numbers");
    }
    if (!(0 <= trimStartPct && trimStartPct < trimEndPct && trimEndPct <= 1) || zoneDuration <= 0) {
      throw new Error("Require 0 <= trimStartPct < trimEndPct <= 1 and zoneDuration > 0");
    }
    if (
      (loopMode !== "closed" && loopMode !== "open") ||
      (zoneMode !== "modify" && zoneMode !== "extend")
    ) {
      throw new Error("Invalid loopMode or zoneMode");
    }
    if (zoneEndPosition != null) {
      const keys = Object.keys(zoneEndPosition);
      const allowed = new Set(["x", "y", "facingAngle"]);
      if (
        loopMode !== "open" ||
        !("x" in zoneEndPosition) ||
        !("y" in zoneEndPosition) ||
        !keys.every((k) => allowed.has(k)) ||
        !Object.values(zoneEndPosition).every(finite)
      ) {
        throw new Error("An open-loop target requires finite x/y and optional facingAngle");
      }
    }

    const motion = await this._client._graphql<Motion | null>(
      CREATE_LOOPED_MOTION,
      {
        character_id: characterId,
        motion_id: motionId,
        trim_start_pct: trimStartPct,
        trim_end_pct: trimEndPct,
        zone_duration: zoneDuration,
        loop_mode: loopMode,
        zone_mode: zoneMode,
        zone_end_position:
          zoneEndPosition == null
            ? null
            : {
                x: zoneEndPosition.x,
                y: zoneEndPosition.y,
                ...(zoneEndPosition.facingAngle != null
                  ? { facing_angle: zoneEndPosition.facingAngle }
                  : {}),
              },
      },
      {
        path: "create_looped_motion.motion",
        timeoutSeconds,
      },
    );
    if (!motion || typeof motion.id !== "string" || !motion.id.trim()) {
      throw new UthanaError(
        502,
        "The operation returned no motion ID and may have succeeded. Inspect existing work before resubmitting.",
        "uncertain",
      );
    }
    return motion;
  }

  /** Check download eligibility without downloading. */
  async downloadAllowed(motionId: string, characterId: string): Promise<DownloadAllowed> {
    return this._client._graphql<DownloadAllowed>(
      MOTION_DOWNLOAD_ALLOWED,
      { motionId, characterId },
      { path: "motion_download_allowed", pathDefault: { allowed: false } },
    );
  }

  /** Rate a motion (thumbs up/down). score: 1 = thumbs up, 0 = thumbs down. */
  async rate(
    motion_id: string,
    score: 0 | 1,
    options?: { label_id?: string | null },
  ): Promise<void> {
    await this._client._graphql(RATE_MOTION, {
      motion_id,
      label_id: options?.label_id ?? null,
      score,
    });
  }

  /** Download a GLB, FBX, or BVH animation retargeted to the given character. */
  async download(
    character_id: string,
    motion_id: string,
    options?: {
      output_format?: OutputFormat;
      fps?: number | null;
      no_mesh?: boolean | null;
      in_place?: boolean | null;
      roblox_compatible?: boolean | null;
      speed_multiplier?: number | null;
      torso_only?: boolean | null;
      maxBytes?: number | null;
    },
  ): Promise<ArrayBuffer> {
    const url = this._client._motionUrl({
      character_id,
      motion_id,
      output_format: options?.output_format ?? "glb",
      fps: options?.fps,
      no_mesh: options?.no_mesh,
      in_place: options?.in_place,
      roblox_compatible: options?.roblox_compatible,
      speed_multiplier: options?.speed_multiplier,
      torso_only: options?.torso_only,
    });
    return this._client._requestBytes(url, { maxBytes: options?.maxBytes });
  }

  /** Download Unitree G1 CSV joint trajectories; retargeting can take several minutes. */
  async downloadRobot(
    characterId: string,
    motionId: string,
    options: {
      robot?: RobotFormat;
      fps?: number | null;
      maxBytes?: number | null;
      timeoutSeconds?: number;
    } = {},
  ): Promise<ArrayBuffer> {
    const robot = options.robot ?? "unitree_g1";
    if (robot !== "unitree_g1") {
      throw new Error("Robot must be unitree_g1");
    }
    if (options.fps != null && !ROBOT_DOWNLOAD_FPS.includes(options.fps)) {
      throw new Error("Robot download fps must be 24, 30, or 60");
    }
    if (
      options.maxBytes != null &&
      (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 1)
    ) {
      throw new Error("Robot download maxBytes must be a positive safe integer");
    }
    const timeoutSeconds = options.timeoutSeconds ?? ROBOT_DOWNLOAD_TIMEOUT_SECONDS;
    if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
      throw new Error("Robot download timeoutSeconds must be a positive finite number");
    }
    const character = encodeURIComponent(characterId);
    const motion = encodeURIComponent(motionId);
    let url = `${this._client.baseUrl}/motion/file/motion_viewer/${character}/${motion}/csv/${robot}_${character}-${motion}.csv`;
    if (options.fps != null) {
      url += `?fps=${options.fps}`;
    }
    return this._client._requestBytes(url, { maxBytes: options.maxBytes, timeoutSeconds });
  }

  /** Download a WebM or APNG preview (does not charge download seconds). */
  async preview(
    character_id: string,
    motion_id: string,
    {
      timeoutSeconds = 60,
      ...options
    }: {
      format?: "webm" | "apng";
      maxBytes?: number | null;
      timeoutSeconds?: number;
    } = {},
  ): Promise<ArrayBuffer> {
    const format = options?.format ?? "webm";
    if (format !== "webm" && format !== "apng") {
      throw new Error("Preview format must be webm or apng");
    }
    const suffix = format === "apng" ? "png" : "webm";
    const url = `${this._client.baseUrl}/app/preview/${encodeURIComponent(character_id)}/${encodeURIComponent(motion_id)}/preview.${suffix}`;
    return this._client._requestBytes(url, {
      maxBytes: options?.maxBytes,
      timeoutSeconds,
    });
  }

  /** Make this motion publicly viewable. Anyone with the link can open it without an account. */
  async share(
    characterId: string,
    motionId: string,
    {
      start = 0,
      end = 1,
      timeoutSeconds,
    }: { start?: number; end?: number; timeoutSeconds?: number } = {},
  ): Promise<ShareLink> {
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      !(0 <= start && start < end && end <= 1)
    ) {
      throw new Error("Share fractions must be finite and satisfy 0 <= start < end <= 1");
    }
    const data = await this._client._graphql<unknown>(
      CREATE_SHARE_LINK,
      {
        character_id: characterId,
        motion_id: motionId,
        start,
        end,
        fps: SHARE_IMAGE_FPS,
        wd: SHARE_IMAGE_WIDTH_PX,
        ht: SHARE_IMAGE_HEIGHT_PX,
      },
      { path: "create_share_link", timeoutSeconds },
    );
    if (
      data === null ||
      typeof data !== "object" ||
      !("png_url" in data) ||
      typeof data.png_url !== "string" ||
      !data.png_url.trim()
    ) {
      throw new UthanaError(
        502,
        "create_share_link returned no preview image URL, so the link may not be public. Open the motion in the Uthana app and use Share before sending it.",
        "uncertain",
      );
    }
    let previewUrl = `${this._client.baseUrl}/app/preview/${encodeURIComponent(characterId)}/${encodeURIComponent(motionId)}`;
    if (start !== 0 || end !== 1) {
      previewUrl += `?start=${start}&end=${end}`;
    }
    return {
      character_id: characterId,
      motion_id: motionId,
      start,
      end,
      preview_url: previewUrl,
      png_url: data.png_url,
    };
  }

  /** Soft-delete a motion by ID, returning its updated record. */
  async delete(motion_id: string): Promise<Motion> {
    return this._update(motion_id, { deleted: true });
  }

  /** Rename a motion by ID, returning its updated record. */
  async rename(motion_id: string, new_name: string): Promise<Motion> {
    return this._update(motion_id, { name: new_name });
  }

  /** Restore a soft-deleted motion by ID using existing write permissions. */
  async restore(motionId: string): Promise<Motion> {
    return this._update(motionId, { deleted: false });
  }

  private async _update(
    motionId: string,
    changes: { name?: string; deleted?: boolean },
  ): Promise<Motion> {
    return this._client._graphql<Motion>(
      UPDATE_MOTION,
      { motion_id: motionId, ...changes },
      { path: "update_motion.motion" },
    );
  }

  /** Set or unset a motion as favorite. */
  async favorite(motion_id: string, favorite: boolean): Promise<void> {
    if (favorite) {
      await this._client._graphql(CREATE_MOTION_FAVORITE, { motion_id });
    } else {
      await this._client._graphql(DELETE_MOTION_FAVORITE, { motion_id });
    }
  }

  /**
   * Bake GLTF content as a new motion for an existing character.
   * Optionally associate with a source motion via `sourceMotionId`.
   */
  async bakeWithChanges(
    gltf_content: string,
    motion_name: string,
    options?: { character_id?: string | null; sourceMotionId?: string | null },
  ): Promise<TextToMotionResult> {
    const charId = options?.character_id ?? UthanaCharacters.tar;
    const variables: Record<string, unknown> = {
      gltf: gltf_content,
      motionName: motion_name,
      characterId: charId,
    };
    if (options?.sourceMotionId != null) {
      variables.sourceMotionId = options.sourceMotionId;
    }
    const result = (await this._client._graphql<Record<string, unknown>>(
      CREATE_MOTION_FROM_GLTF,
      variables,
      { path: "create_motion_from_gltf" },
    )) as Record<string, unknown>;

    const motion = result?.motion as Record<string, unknown> | undefined;
    const motionId = motion?.id as string | undefined;
    if (!motionId) {
      throw new UthanaError(400, "create_motion_from_gltf did not return motion id", "client");
    }
    return { character_id: charId, motion_id: motionId };
  }

  /**
   * Generate controllable locomotion for a character (stride count, speed, style, direction).
   * See https://uthana.com/docs/api/capabilities/locomotion
   */
  async createLocomotion(
    character_id: string,
    options?: CreateLocomotionOptions | null,
  ): Promise<TextToMotionResult> {
    const variables: Record<string, unknown> = { character_id };
    if (options?.strides != null) variables.strides = options.strides;
    if (options?.move_speed != null) variables.move_speed = options.move_speed;
    if (options?.style_id != null) variables.style_id = options.style_id;
    if (options?.travel_angle != null) variables.travel_angle = options.travel_angle;

    const result = (await this._client._graphql<Record<string, unknown>>(
      CREATE_LOCOMOTION,
      variables,
      { path: "create_locomotion" },
    )) as Record<string, unknown>;

    const motion = result?.motion as Record<string, unknown> | undefined;
    const motionId = motion?.id as string | undefined;
    if (!motionId) {
      throw new UthanaError(400, "create_locomotion did not return motion id", "client");
    }
    return { character_id, motion_id: motionId };
  }

  /** All style_id values accepted by createLocomotion. */
  async listLocomotionStyles(): Promise<string[]> {
    return this._client._graphql<string[]>(
      LIST_LOCOMOTION_STYLES,
      {},
      { path: "locomotion_styles", pathDefault: [] },
    );
  }
}
