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
  deleted?: string | null;
  org_id?: string | null;
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
  favorite?: {
    /** @deprecated Legacy internal identifier; not needed for normal feedback. */
    user_id?: string;
    /** @deprecated Legacy annotation identifier; not needed for normal feedback. */
    label_id?: string;
    created?: string;
    updated?: string;
  } | null;
  rating?: {
    /** @deprecated Legacy internal identifier; not needed for normal feedback. */
    user_id?: string;
    /** @deprecated Legacy annotation identifier; not needed for normal feedback. */
    label_id?: string;
    score?: number;
    created?: string;
    updated?: string;
  } | null;
  tags?: Record<string, unknown> | string[] | null;
  assets?: Array<{
    id?: string;
    uid?: string;
    type?: string;
    sha256?: string;
    metadata?: Record<string, unknown> | null;
  }> | null;
}

/** Motion catalog response from motions.catalog. */
export interface MotionCatalog {
  org?: { id?: string } | null;
  motions?: Motion[];
}

/** Download eligibility from motions.downloadAllowed. */
export interface DownloadAllowed {
  allowed?: boolean;
  reason?: string | null;
}

/** PAYG price row from org.getPrices. */
export interface PaygPrice {
  model_key?: string;
  billing_unit?: string;
  unit_price?: string;
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
  model?: string | null;
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

/** Optional inputs for motions.createLocomotion (see Uthana locomotion API). */
export interface CreateLocomotionOptions {
  /** Full stride pairs, 1–5; API default 4. */
  strides?: number | null;
  /** Speed in m/s, 0.25–8.0; API default 1.2. */
  move_speed?: number | null;
  /** From listLocomotionStyles; API default neutral_male_a. */
  style_id?: string | null;
  /** Direction in degrees on ground plane, -180 to 180; API default 0. */
  travel_angle?: number | null;
}

/** Result of characters.createFromFile(). */
export interface CreateCharacterResult {
  url: string;
  character_id: string;
  auto_rig_confidence?: number | null;
  message?: string | null;
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

/** TTM model types. Canonical X.Y names or legacy aliases accepted for backward compatibility. */
export type TtmModelType =
  | "text-to-motion-1.0"
  | "text-to-motion-2.0"
  | "vqvae-v1"
  | "diffusion-v2"
  | "text-to-motion"
  | "text-to-motion-bucmd";

/** VTM model types */
export type VtmModelType =
  | "video-to-motion-2.0"
  | "video-to-motion-2.1"
  | "video-to-motion-3.0"
  | "video-to-motion-v2";

/** TTM job model types (async job API) */
export type TtmJobModelType =
  | "text-to-motion-3.0"
  | "text-to-motion-3.0-lite"
  | "text-to-motion-3.0-mini";

/** Combined model type */
export type ModelType = "auto" | TtmModelType | TtmJobModelType | VtmModelType;

/** Output format for motion/character files */
export type OutputFormat = "glb" | "fbx" | "bvh";

export const DEFAULT_OUTPUT_FORMAT: OutputFormat = "glb";
export const DEFAULT_TIMEOUT = 120.0;
export const DEFAULT_BYTE_UPLOAD_MAX = 128 * 1024 * 1024;
export const SUPPORTED_VIDEO_FORMATS = new Set([".mp4", ".mov", ".avi"]);

/** Pre-built character IDs. Use these without uploading your own character. */
export const UthanaCharacters = {
  tar: "cXi2eAP19XwQ",
  ava: "cmEE2fT4aSaC",
  manny: "c43tbGks3crJ",
  quinn: "czCjWEMtWxt8",
  y_bot: "cJM4ngRqXg83",
} as const;

/** Which saved assets to include. mine means the caller's organization. */
export type AssetSource = "all" | "mine" | "uthana";
export type AssetOrder = "created_desc" | "created_asc" | "name_asc" | "name_desc";

/** Server defaults apply to omitted and null options. */
export interface AssetPageOptions {
  query?: string | null;
  source?: AssetSource | null;
  order?: AssetOrder | null;
  limit?: number | null;
  cursor?: string | null;
}

export interface MotionPageOptions extends AssetPageOptions {
  method?: string | null;
}

export interface CharacterPage {
  items: Character[];
  next_cursor: string | null;
}

export interface MotionPage {
  items: Motion[];
  next_cursor: string | null;
}

/** PAYG ledger row. USD amounts are decimal strings; zero remains distinct from unknown. */
export interface LedgerEntry {
  id: string;
  created?: string;
  type?: string;
  total_usd?: string;
  balance_before?: string | null;
  balance_after?: string | null;
  /** Charged motion/character ID despite the historical name. */
  job_id?: string | null;
  /** Processing job ID for jobs.get(). */
  task_id?: string | null;
  model?: string | null;
  model_version?: string | null;
  billing_unit?: string | null;
  quantity?: number | null;
  unit_price?: string | null;
  ref?: string | null;
  status?: string | null;
}

/** Ledger filters restricted to the last seven days, relative to the client clock. */
export interface LedgerOptions {
  limit?: number;
  beforeId?: string | null;
  since?: Date | string | null;
  until?: Date | string | null;
  types?: string[] | null;
}

/** Supported robot joint-trajectory export. */
export type RobotFormat = "unitree_g1";

/** Explicitly published viewer link and social preview image. */
export interface ShareLink {
  character_id: string;
  motion_id: string;
  start: number;
  end: number;
  preview_url: string;
  png_url: string;
}

/** Personal vote: "like", "dislike", or null to clear it. */
export type MotionRatingValue = "like" | "dislike" | null;

/** Changes to a character. Omitted fields stay unchanged. */
export interface ModifyCharacterParams {
  character_id: string;
  name?: string;
  deleted?: boolean;
}

/** Changes to a motion. Omitted fields stay unchanged. */
export interface ModifyMotionParams {
  motion_id: string;
  name?: string;
  deleted?: boolean;
}
