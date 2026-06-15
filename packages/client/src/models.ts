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
 * Maps model strings to the API string the server currently accepts.
 *
 * VTM: old alias maps forward to the new canonical name (server already accepts these).
 * TTM sync: both new canonical names AND legacy friendly names map down to current API strings.
 *   Remove the TTM entries once the API starts accepting "text-to-motion-1.0" / "text-to-motion-2.0".
 */
export const LEGACY_MODEL_SHIM: Record<string, string> = {
  // VTM legacy alias → new canonical (API already accepts these)
  "video-to-motion-v2": "video-to-motion-2.0",
  // TTM sync: canonical X.Y → current API strings (remove when API accepts X.Y directly)
  "text-to-motion-1.0": "text-to-motion",
  "text-to-motion-2.0": "text-to-motion-bucmd",
  // TTM sync: legacy friendly names → current API strings (backward compat)
  "vqvae-v1": "text-to-motion",
  "diffusion-v2": "text-to-motion-bucmd",
};

export function normalizeModelName(model: string): string {
  return LEGACY_MODEL_SHIM[model] ?? model;
}
