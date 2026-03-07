/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import type { TextToMotionResult, TtmModelType } from "../types";
import { UthanaCharacters } from "../types";
import { BaseModule } from "./base";

/** Text to motion: generate animations from natural language prompts. */
export class TtmModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** Generate a 3D character animation from a natural language prompt. */
  async create(
    prompt: string,
    options?: {
      model?: TtmModelType | null;
      character_id?: string | null;
      foot_ik?: boolean | null;
      enhance_prompt?: boolean | null;
      steps?: number | null;
      length?: number | null;
      cfg_scale?: number | null;
      seed?: number | null;
      internal_ik?: boolean | null;
    },
  ): Promise<TextToMotionResult> {
    const opts = options ?? {};
    const { mutation, variables } = this._client._prepareTextToMotion({
      model: opts.model ?? "auto",
      prompt,
      character_id: opts.character_id ?? null,
      foot_ik: opts.foot_ik ?? null,
      enhance_prompt: opts.enhance_prompt ?? null,
      steps: opts.steps ?? null,
      length: opts.length ?? null,
      cfg_scale: opts.cfg_scale ?? null,
      seed: opts.seed ?? null,
      internal_ik: opts.internal_ik ?? null,
    });

    const data = (await this._client._graphql<Record<string, unknown>>(mutation, variables, {
      path: "create_text_to_motion",
    })) as Record<string, unknown>;

    const motion = data?.motion as Record<string, unknown> | undefined;
    const motionId = motion?.id as string;
    const characterId = options?.character_id ?? UthanaCharacters.tar;

    return { character_id: characterId, motion_id: motionId };
  }
}
