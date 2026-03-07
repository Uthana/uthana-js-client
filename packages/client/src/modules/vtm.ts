/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { CREATE_VIDEO_TO_MOTION } from "../graphql.js";
import { models } from "../models.js";
import { prepareVideoToMotion } from "../utils.js";
import type { UthanaClient } from "../client.js";
import type { VideoToMotionResult, VtmModelType } from "../types.js";
import { BaseModule } from "./base.js";

/** Video to motion: extract motion capture from video files. */
export class VtmModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** Extract motion capture data from a video. Returns a job to poll via jobs.get(). */
  async create(
    file: File | Blob | string,
    options?: {
      motion_name?: string | null;
      model?: VtmModelType | null;
    }
  ): Promise<VideoToMotionResult> {
    let variables: Record<string, unknown>;
    let blob: Blob;

    if (typeof file === "string") {
      const prepared = prepareVideoToMotion(file, options?.motion_name ?? null);
      const mod = await import("node:fs/promises");
      const buf = await mod.readFile(file);
      blob = new Blob([buf], { type: "application/octet-stream" });
      variables = { ...prepared.variables, file: blob };
    } else {
      const filename = file instanceof File ? file.name : "video.mp4";
      const prepared = prepareVideoToMotion(filename, options?.motion_name ?? null);
      variables = { ...prepared.variables, file };
    }

    variables.model = options?.model ?? models.vtm.default;

    const job = await this._client._graphql<VideoToMotionResult>(
      CREATE_VIDEO_TO_MOTION,
      variables,
      { path: "create_video_to_motion.job" }
    );
    return job;
  }
}
