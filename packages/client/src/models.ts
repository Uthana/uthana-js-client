/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { TtmModelType, VtmModelType } from "./types";

export const TTM_DEFAULT: TtmModelType = "text-to-motion-1.0";
export const TTM_MODELS: readonly TtmModelType[] = [
  "text-to-motion-1.0",
  "text-to-motion-2.0",
] as const;

export const VTM_DEFAULT: VtmModelType = "video-to-motion-2.0";
export const VTM_MODELS: readonly VtmModelType[] = [
  "video-to-motion-2.0",
  "video-to-motion-2.1",
  "video-to-motion-v2",
] as const;

export const models = {
  ttm: { default: TTM_DEFAULT, models: TTM_MODELS },
  vtm: { default: VTM_DEFAULT, models: VTM_MODELS },
};

/**
 * Maps legacy/non-X.Y model strings to their canonical X.Y equivalents.
 * Update this table when the API renames models; no other code changes required.
 */
export const LEGACY_MODEL_SHIM: Record<string, string> = {
  "video-to-motion-v2": "video-to-motion-2.0",
  "vqvae-v1": "text-to-motion-1.0",
  "text-to-motion": "text-to-motion-1.0",
  "diffusion-v2": "text-to-motion-2.0",
  "text-to-motion-bucmd": "text-to-motion-2.0",
};

export function normalizeModelName(model: string): string {
  return LEGACY_MODEL_SHIM[model] ?? model;
}
