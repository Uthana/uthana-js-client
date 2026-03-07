/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

/** User object from org.get_user. */
export interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  email_verified?: boolean | null;
}

/** Org object from org.get_org. */
export interface Org {
  id?: string;
  name?: string | null;
  motion_download_secs_per_month?: number | null;
  motion_download_secs_per_month_remaining?: number | null;
}

/** Character object from characters.list. */
export interface Character {
  id?: string;
  name?: string | null;
  created?: string | null;
  updated?: string | null;
}

/** Motion object from motions.list or update_motion (delete/rename). */
export interface Motion {
  id?: string;
  name?: string | null;
  created?: string | null;
  deleted?: string | null;
}

/** Job object from jobs.get, jobs.list, or vtm.create. Poll until status is FINISHED or FAILED. */
export interface Job {
  id?: string;
  status: string;
  method?: string | null;
  created?: string | null;
  updated?: string | null;
  result?: Record<string, unknown> | null;
}

/** Result of ttm.create or characters.create_from_gltf mutation. */
export interface TextToMotionResult {
  character_id: string;
  motion_id: string;
}

/** Result of characters.create mutation. */
export interface CreateCharacterResult {
  url: string;
  character_id: string;
  auto_rig_confidence?: number | null;
}

/** Alias for vtm.create return type */
export type VideoToMotionResult = Job;

/** TTM model types */
export type TtmModelType = "vqvae-v1" | "diffusion-v2";

/** VTM model types */
export type VtmModelType = "video-to-motion-v1" | "video-to-motion-v2";

/** Combined model type */
export type ModelType = "auto" | TtmModelType | VtmModelType;

/** Output format for motion/character files */
export type OutputFormat = "glb" | "fbx";

export const DEFAULT_OUTPUT_FORMAT: OutputFormat = "glb";
export const DEFAULT_TIMEOUT = 120.0;
export const SUPPORTED_VIDEO_FORMATS = new Set([".mp4", ".mov", ".avi"]);

/** Pre-built character IDs. Use these without uploading your own character. */
export const UthanaCharacters = {
  tar: "cXi2eAP19XwQ",
  ava: "cmEE2fT4aSaC",
  manny: "c43tbGks3crJ",
  quinn: "czCjWEMtWxt8",
  y_bot: "cJM4ngRqXg83",
} as const;
