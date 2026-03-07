/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { TtmModelType, VtmModelType } from "./types.js";

export const TTM_DEFAULT: TtmModelType = "vqvae-v1";
export const TTM_MODELS: readonly TtmModelType[] = [
  "vqvae-v1",
  "diffusion-v2",
] as const;

export const VTM_DEFAULT: VtmModelType = "video-to-motion-v1";
export const VTM_MODELS: readonly VtmModelType[] = [
  "video-to-motion-v1",
  "video-to-motion-v2",
] as const;

export const models = {
  ttm: { default: TTM_DEFAULT, models: TTM_MODELS },
  vtm: { default: VTM_DEFAULT, models: VTM_MODELS },
};
