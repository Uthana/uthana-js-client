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

/** Motion object from motions.list, motions.get, or update_motion (delete/rename). */
export interface Motion {
  id?: string;
  name?: string | null;
  org_id?: string | null;
  created?: string | null;
  updated?: string | null;
  deleted?: string | null;
  favorite?: { user_id?: string; label_id?: string; created?: string; updated?: string } | null;
  rating?: { user_id?: string; label_id?: string; score?: number; created?: string } | null;
  tags?: string[] | null;
}

/** Motion download record from motion_downloads query. */
export interface MotionDownloadRecord {
  motion_id: string;
  character_id: string;
  secs: number;
  created?: string | null;
  motion?: Motion | null;
}

/** Job object from jobs.get, jobs.list, or vtm.create. Poll until status is FINISHED or FAILED. */
export interface Job {
  id?: string;
  status: string;
  method?: string | null;
  created?: string | null;
  started?: string | null;
  ended?: string | null;
  result?: Record<string, unknown> | null;
}

/** Result of ttm.create or motions.bakeWithChanges mutation. */
export interface TextToMotionResult {
  character_id: string;
  motion_id: string;
}

/** Result of characters.createFromFile(). */
export interface CreateCharacterResult {
  url: string;
  character_id: string;
  auto_rig_confidence?: number | null;
}

/**
 * Intermediate result of characters.createFromPrompt when no onPreviewsReady callback is provided.
 * Pass to characters.generateFromImage() to finalize the character.
 */
export interface CharacterPreviewResult {
  character_id: string;
  previews: { key: string; url: string }[];
  /** Stored internally so generateFromImage() doesn't require re-specifying it. */
  prompt: string;
}

/** Result of characters.createFromPrompt / createFromImage (with callback where applicable), or characters.generateFromImage(). */
export interface CreateFromGeneratedImageResult {
  character: Character;
  auto_rig_confidence?: number | null;
}

/** Alias for vtm.create return type */
export type VideoToMotionResult = Job;

/** TTM model types. Friendly names (vqvae-v1, diffusion-v2) or server aliases (text-to-motion, text-to-motion-bucmd). */
export type TtmModelType =
  | "vqvae-v1"
  | "diffusion-v2"
  | "flow-matching-v1"
  | "text-to-motion"
  | "text-to-motion-bucmd";

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
