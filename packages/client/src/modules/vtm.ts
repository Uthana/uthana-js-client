/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import { CREATE_VIDEO_TO_MOTION } from "../graphql";
import { models, normalizeModelName } from "../models";
import type { VideoToMotionResult, VtmModelType } from "../types";
import { prepareVideoToMotion, validateUploadLimit } from "../utils";
import { BaseModule } from "./base";
import { transformJob } from "./jobs";

const VIDEO_UPLOAD_MAX_BYTES = 200 * 1024 * 1024;

/** Video to motion: extract motion capture from video files. */
export class VtmModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /**
   * Extract motion capture from a video up to 200 MiB. Poll via jobs.get().
   * The API limits organizations without an active payment method or agreement to 50 MiB.
   * maxBytes can lower the client limit; null cannot remove the 200 MiB cap.
   */
  async create(
    file: File | Blob | string,
    options?: {
      motion_name?: string | null;
      model?: VtmModelType | null;
      maxBytes?: number | null;
    },
  ): Promise<VideoToMotionResult> {
    validateUploadLimit(options?.maxBytes);
    let variables: Record<string, unknown>;
    let blob: Blob;
    let uploadFilename: string;

    if (typeof file === "string") {
      const prepared = prepareVideoToMotion(file, options?.motion_name ?? null);
      const mod = await import("node:fs/promises");
      if ((await mod.stat(file)).size > VIDEO_UPLOAD_MAX_BYTES) {
        throw new Error("Video upload exceeds 200 MiB. Upload a smaller video.");
      }
      const buf = await mod.readFile(file);
      if (buf.byteLength > VIDEO_UPLOAD_MAX_BYTES) {
        throw new Error("Video upload exceeds 200 MiB. Upload a smaller video.");
      }
      if (options?.maxBytes != null && buf.byteLength > options.maxBytes) {
        throw new Error("Video upload exceeds maxBytes");
      }
      blob = new Blob([buf], { type: "application/octet-stream" });
      variables = prepared.variables;
      uploadFilename = prepared.filename;
    } else {
      const filename = file instanceof File ? file.name : "video.mp4";
      const prepared = prepareVideoToMotion(filename, options?.motion_name ?? null);
      blob = file instanceof Blob ? file : new Blob([], { type: "application/octet-stream" });
      if (blob.size > VIDEO_UPLOAD_MAX_BYTES) {
        throw new Error("Video upload exceeds 200 MiB. Upload a smaller video.");
      }
      if (options?.maxBytes != null && blob.size > options.maxBytes) {
        throw new Error("Video upload exceeds maxBytes");
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
      maxBytes?: number | null;
    },
  ): Promise<VideoToMotionResult> {
    const maxBytes = options?.maxBytes === undefined ? VIDEO_UPLOAD_MAX_BYTES : options.maxBytes;
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
    if (bytes.byteLength > VIDEO_UPLOAD_MAX_BYTES) {
      throw new Error("Video upload exceeds 200 MiB. Upload a smaller video.");
    }
    if (maxBytes != null && bytes.byteLength > maxBytes) {
      throw new Error("Video upload exceeds maxBytes");
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
