/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import { CREATE_VIDEO_TO_MOTION } from "../graphql";
import { models, normalizeModelName } from "../models";
import { DEFAULT_BYTE_UPLOAD_MAX } from "../types";
import type { VideoToMotionResult, VtmModelType } from "../types";
import { prepareVideoToMotion, validateUploadLimit } from "../utils";
import { BaseModule } from "./base";
import { transformJob } from "./jobs";

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
      max_bytes?: number | null;
    },
  ): Promise<VideoToMotionResult> {
    validateUploadLimit(options?.max_bytes);
    let variables: Record<string, unknown>;
    let blob: Blob;
    let uploadFilename: string;

    if (typeof file === "string") {
      const prepared = prepareVideoToMotion(file, options?.motion_name ?? null);
      const mod = await import("node:fs/promises");
      const buf = await mod.readFile(file);
      if (options?.max_bytes != null && buf.byteLength > options.max_bytes) {
        throw new Error("Video upload exceeds max_bytes");
      }
      blob = new Blob([buf], { type: "application/octet-stream" });
      variables = prepared.variables;
      uploadFilename = prepared.filename;
    } else {
      const filename = file instanceof File ? file.name : "video.mp4";
      const prepared = prepareVideoToMotion(filename, options?.motion_name ?? null);
      blob = file instanceof Blob ? file : new Blob([], { type: "application/octet-stream" });
      if (options?.max_bytes != null && blob.size > options.max_bytes) {
        throw new Error("Video upload exceeds max_bytes");
      }
      variables = prepared.variables;
      uploadFilename = prepared.filename;
    }

    variables.model = normalizeModelName(options?.model ?? models.vtm.default);

    const raw = await this._client._graphqlUpload<
      VideoToMotionResult & { created_at?: string | null }
    >(CREATE_VIDEO_TO_MOTION, variables, "file", blob, {
      path: "create_video_to_motion.job",
      filename: uploadFilename,
    });
    return transformJob(raw);
  }

  /** Submit a video byte snapshot without reopening a local file. */
  async createFromBytes(
    filename: string,
    content: ArrayBuffer | Uint8Array | Buffer,
    options?: {
      motion_name?: string | null;
      model?: VtmModelType | null;
      max_bytes?: number | null;
    },
  ): Promise<VideoToMotionResult> {
    const maxBytes = options?.max_bytes === undefined ? DEFAULT_BYTE_UPLOAD_MAX : options.max_bytes;
    validateUploadLimit(maxBytes);
    const bytes =
      content instanceof ArrayBuffer
        ? new Uint8Array(content)
        : content instanceof Uint8Array
          ? content
          : new Uint8Array(content);
    if (!bytes.byteLength) {
      throw new Error("Video upload content must be nonempty bytes");
    }
    if (maxBytes != null && bytes.byteLength > maxBytes) {
      throw new Error("Video upload exceeds max_bytes");
    }
    const prepared = prepareVideoToMotion(filename, options?.motion_name ?? null);
    const variables = {
      ...prepared.variables,
      model: normalizeModelName(options?.model ?? models.vtm.default),
    };
    const blob = new Blob([bytes.slice()], { type: "application/octet-stream" });
    const raw = await this._client._graphqlUpload<
      VideoToMotionResult & { created_at?: string | null }
    >(CREATE_VIDEO_TO_MOTION, variables, "file", blob, {
      path: "create_video_to_motion.job",
      filename: prepared.filename,
    });
    return transformJob(raw);
  }
}
