/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import { CREATE_TEXT_TO_MOTION_JOB } from "../graphql";
import { normalizeModelName } from "../models";
import type { Job, TextToMotionResult, TtmJobModelType, TtmModelType } from "../types";
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
    const rawModel = opts.model ?? "auto";
    const model = rawModel === "auto" ? rawModel : normalizeModelName(rawModel);
    const { mutation, variables } = this._client._prepareTextToMotion({
      model,
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

  /**
   * Submit an async text-to-motion job (TTM 3.0). Returns a Job to poll via jobs.wait().
   * Available to any account on the pay-as-you-go plan. See https://uthana.com/docs/api/pricing.
   */
  async createJob(
    prompt: string,
    options: {
      model: TtmJobModelType;
      character_id?: string | null;
      length?: number | null;
      rewrite_prompt?: boolean | null;
    },
  ): Promise<Job> {
    const variables: Record<string, unknown> = {
      prompt,
      model: normalizeModelName(options.model),
      character_id: options.character_id ?? null,
      length: options.length ?? null,
      rewrite_prompt: options.rewrite_prompt ?? null,
    };

    return this._client._graphql<Job>(CREATE_TEXT_TO_MOTION_JOB, variables, {
      path: "create_text_to_motion_job.job",
    });
  }
}
