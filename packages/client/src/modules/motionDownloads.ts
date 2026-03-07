/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import { GET_MOTION_DOWNLOADS, MOTION_DOWNLOAD_ALLOWED } from "../graphql";
import type { MotionDownloadRecord } from "../types";
import { BaseModule } from "./base";

/** Motion downloads: list downloaded motions and check if download is allowed. */
export class MotionDownloadsModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** List motion downloads for the authenticated user. */
  async list(): Promise<MotionDownloadRecord[]> {
    return this._client._graphql<MotionDownloadRecord[]>(
      GET_MOTION_DOWNLOADS,
      {},
      { path: "motion_downloads", pathDefault: [] },
    );
  }

  /** Check if downloading a motion for a character is allowed (quota, permissions). */
  async check_allowed(character_id: string, motion_id: string): Promise<boolean> {
    const result = await this._client._graphql<{ allowed: boolean }>(
      MOTION_DOWNLOAD_ALLOWED,
      { characterId: character_id, motionId: motion_id },
      { path: "motion_download_allowed", pathDefault: { allowed: false } },
    );
    return result?.allowed ?? false;
  }
}
