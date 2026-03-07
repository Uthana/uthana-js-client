/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import {
  CREATE_MOTION_FAVORITE,
  DELETE_MOTION_FAVORITE,
  GET_MOTION_BY_ID,
  LIST_MOTIONS,
  RATE_MOTION,
  UPDATE_MOTION,
} from "../graphql";
import type { Motion, OutputFormat } from "../types";
import { BaseModule } from "./base";

/** Motion management: list, download, delete, rename, favorite. */
export class MotionsModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** List all motions for the authenticated user. */
  async list(): Promise<Motion[]> {
    return this._client._graphql<Motion[]>(
      LIST_MOTIONS,
      {},
      {
        path: "motions",
        pathDefault: [],
      },
    );
  }

  /** Get a single motion by ID. */
  async get(motion_id: string): Promise<Motion | null> {
    const motion = await this._client._graphql<Motion | null>(
      GET_MOTION_BY_ID,
      { motionId: motion_id },
      { path: "motion", pathDefault: null },
    );
    return motion;
  }

  /** Rate a motion (thumbs up/down). score: 1 = thumbs up, 0 = thumbs down. */
  async rate(
    motion_id: string,
    score: 0 | 1,
    options?: { label_id?: string | null },
  ): Promise<void> {
    await this._client._graphql(RATE_MOTION, {
      motion_id,
      label_id: options?.label_id ?? null,
      score,
    });
  }

  /** Download a motion animation file, retargeted to the given character. */
  async download(
    character_id: string,
    motion_id: string,
    options?: {
      output_format?: OutputFormat;
      fps?: number | null;
      no_mesh?: boolean | null;
    },
  ): Promise<ArrayBuffer> {
    const url = this._client._motionUrl({
      character_id,
      motion_id,
      output_format: options?.output_format ?? "glb",
      fps: options?.fps,
      no_mesh: options?.no_mesh,
    });
    const res = await this._client._fetch(url);
    return res.arrayBuffer();
  }

  /** Download motion preview WebM (does not charge download seconds). */
  async download_preview(character_id: string, motion_id: string): Promise<ArrayBuffer> {
    const url = `${this._client.baseUrl}/app/preview/${character_id}/${motion_id}/preview.webm`;
    const res = await this._client._fetch(url);
    return res.arrayBuffer();
  }

  /** Soft-delete a motion by ID. */
  async delete(motion_id: string): Promise<Motion> {
    return this._client._graphql<Motion>(
      UPDATE_MOTION,
      { id: motion_id, deleted: true },
      { path: "update_motion" },
    );
  }

  /** Rename a motion by ID. */
  async rename(motion_id: string, new_name: string): Promise<Motion> {
    return this._client._graphql<Motion>(
      UPDATE_MOTION,
      { id: motion_id, name: new_name },
      { path: "update_motion" },
    );
  }

  /** Set or unset a motion as favorite. */
  async favorite(motion_id: string, favorite: boolean): Promise<void> {
    if (favorite) {
      await this._client._graphql(CREATE_MOTION_FAVORITE, {
        motion_id,
      });
    } else {
      await this._client._graphql(DELETE_MOTION_FAVORITE, {
        motion_id,
      });
    }
  }
}
