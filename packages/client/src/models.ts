/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { TtmModelType, VtmModelType } from "./types";

export const TTM_DEFAULT: TtmModelType = "vqvae-v1";
export const TTM_MODELS: readonly TtmModelType[] = [
  "vqvae-v1",
  "diffusion-v2",
  "flow-matching-v1",
] as const;

/** Maps client-facing model names to server-side strings. When API accepts friendly names, this becomes identity. */
export const TTM_MODEL_MAP: Record<TtmModelType, string> = {
  "vqvae-v1": "text-to-motion",
  "text-to-motion": "text-to-motion",
  "diffusion-v2": "text-to-motion-bucmd",
  "text-to-motion-bucmd": "text-to-motion-bucmd",
  "flow-matching-v1": "flow-matching-v1",
};

export const VTM_DEFAULT: VtmModelType = "video-to-motion-v1";
export const VTM_MODELS: readonly VtmModelType[] = [
  "video-to-motion-v1",
  "video-to-motion-v2",
] as const;

export const models = {
  ttm: { default: TTM_DEFAULT, models: TTM_MODELS },
  vtm: { default: VTM_DEFAULT, models: VTM_MODELS },
};
