/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import { UthanaError } from "../errors";
import {
  CREATE_ENHANCED_STITCHED_MOTION,
  CREATE_LOCOMOTION,
  CREATE_LOOPED_MOTION,
  CREATE_MOTION_FAVORITE,
  CREATE_MOTION_FROM_GLTF,
  DELETE_MOTION_FAVORITE,
  GET_MOTION_BY_ID,
  LIST_LOCOMOTION_STYLES,
  LIST_MOTIONS,
  MOTION_CATALOG,
  MOTION_DOWNLOAD_ALLOWED,
  RATE_MOTION,
  TRIM_MOTION,
  UPDATE_MOTION,
} from "../graphql";
import { type StitchParams, validateStitchParams } from "../stitch";
import type {
  CreateLocomotionOptions,
  DownloadAllowed,
  Motion,
  MotionCatalog,
  OutputFormat,
  TextToMotionResult,
} from "../types";
import { UthanaCharacters } from "../types";
import { BaseModule } from "./base";

/** Motion management: list, download, delete, rename, favorite, stitch, loop. */
export class MotionsModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** List all motions for the authenticated user. */
  async list(): Promise<Motion[]> {
    return this._client._graphql<Motion[]>(LIST_MOTIONS, {}, { path: "motions", pathDefault: [] });
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

  /**
   * Join two sampled clips through the enhanced stitch preview API.
   * Default timeout 360s. Missing motion ID raises kind="uncertain".
   */
  async createStitchedMotion(
    characterId: string,
    prefix: StitchParams,
    suffix: StitchParams,
    options?: { timeoutSeconds?: number },
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
        timeoutSeconds: options?.timeoutSeconds ?? 360,
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
    options?: {
      trimStartPct?: number;
      trimEndPct?: number;
      zoneDuration?: number;
      loopMode?: "closed" | "open";
      zoneMode?: "modify" | "extend";
      zoneEndPosition?: { x: number; y: number; facingAngle?: number } | null;
      timeoutSeconds?: number;
    },
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
        timeoutSeconds: options?.timeoutSeconds ?? 360,
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

  /** Download a WebM or APNG preview (does not charge download seconds). */
  async preview(
    character_id: string,
    motion_id: string,
    options?: {
      format?: "webm" | "apng";
      maxBytes?: number | null;
      timeoutSeconds?: number;
    },
  ): Promise<ArrayBuffer> {
    const format = options?.format ?? "webm";
    if (format !== "webm" && format !== "apng") {
      throw new Error("Preview format must be webm or apng");
    }
    const suffix = format === "apng" ? "png" : "webm";
    const url = `${this._client.baseUrl}/app/preview/${encodeURIComponent(character_id)}/${encodeURIComponent(motion_id)}/preview.${suffix}`;
    return this._client._requestBytes(url, {
      maxBytes: options?.maxBytes,
      timeoutSeconds: options?.timeoutSeconds ?? 60,
    });
  }

  /** Soft-delete a motion by ID. */
  async delete(motion_id: string): Promise<Motion> {
    return this._client._graphql<Motion>(
      UPDATE_MOTION,
      { id: motion_id, deleted: true },
      { path: "update_motion" },
    );
  }

  /** Rename a motion by ID. */
  async rename(motion_id: string, new_name: string): Promise<Motion> {
    return this._client._graphql<Motion>(
      UPDATE_MOTION,
      { id: motion_id, name: new_name },
      { path: "update_motion" },
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
