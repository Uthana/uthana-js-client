/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { Graffle } from "graffle";
import { Upload } from "graffle/extensions/upload";
import { Throws } from "graffle/extensions/throws";
import { UthanaError } from "./errors.js";
import {
  TEXT_TO_MOTION_VQVAE_V1,
  TEXT_TO_MOTION_DIFFUSION_V2,
} from "./graphql.js";
import { models } from "./models.js";
import { CharactersModule } from "./modules/characters.js";
import { JobsModule } from "./modules/jobs.js";
import { MotionsModule } from "./modules/motions.js";
import { OrgModule } from "./modules/org.js";
import { TtmModule } from "./modules/ttm.js";
import { VtmModule } from "./modules/vtm.js";
import type { CreateCharacterResult, ModelType, OutputFormat } from "./types.js";
import { DEFAULT_TIMEOUT } from "./types.js";

/** Options for UthanaClient construction. */
export interface UthanaClientOptions {
  /** API host (e.g. "uthana.com"). Defaults to production when omitted. */
  domain?: string;
  /** Request timeout in seconds. */
  timeout?: number;
}

/**
 * Main client for the Uthana API. Use modules for organized access:
 * - ttm: text to motion
 * - vtm: video to motion
 * - characters: character management
 * - motions: motion management
 * - org: user and organization info
 * - jobs: async job polling
 */
export class UthanaClient {
  readonly baseUrl: string;
  readonly graphqlUrl: string;
  readonly timeout: number;

  readonly ttm: TtmModule;
  readonly vtm: VtmModule;
  readonly characters: CharactersModule;
  readonly motions: MotionsModule;
  readonly org: OrgModule;
  readonly jobs: JobsModule;

  private readonly _graffle: {
    gql: (query: string) => { $send: (vars?: Record<string, unknown>) => Promise<unknown> };
  };
  private readonly _authHeader: string;

  constructor(
    public readonly apiKey: string,
    options: UthanaClientOptions = {}
  ) {
    const domain = options.domain ?? "uthana.com";
    this.baseUrl = `https://${domain}`;
    this.graphqlUrl = `${this.baseUrl}/graphql`;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this._authHeader =
      "Basic " +
      (typeof globalThis.btoa !== "undefined"
        ? globalThis.btoa(`${apiKey}:`)
        : Buffer.from(`${apiKey}:`).toString("base64"));

    this._graffle = Graffle.create()
      .transport({
        url: this.graphqlUrl,
        headers: {
          Authorization: this._authHeader,
        },
      })
      .use(Upload)
      .use(Throws);

    this.ttm = new TtmModule(this);
    this.vtm = new VtmModule(this);
    this.characters = new CharactersModule(this);
    this.motions = new MotionsModule(this);
    this.org = new OrgModule(this);
    this.jobs = new JobsModule(this);
  }

  /** Execute a GraphQL query (async). Optionally extract path from data. Supports Blob/File in variables for uploads. */
  async _graphql<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
    options?: { path?: string; pathDefault?: unknown }
  ): Promise<T> {
    const doc = this._graffle.gql(query);
    const result = (await doc.$send(variables)) as Record<string, unknown>;
    const data = (result?.data ?? result) as Record<string, unknown>;

    if (options?.path) {
      const parts = options.path.split(".");
      let out: unknown = data;
      for (const key of parts) {
        out = (out as Record<string, unknown>)?.[key];
      }
      return (out ?? options.pathDefault ?? {}) as T;
    }
    return data as T;
  }

  _motionUrl(options: {
    character_id: string;
    motion_id: string;
    output_format: OutputFormat;
    fps?: number | null;
    no_mesh?: boolean | null;
  }): string {
    const ext = options.output_format.toLowerCase();
    let url = `${this.baseUrl}/motion/file/motion_viewer/${options.character_id}/${options.motion_id}/${ext}/${options.character_id}-${options.motion_id}.${ext}`;
    const params: string[] = [];
    if (options.fps != null) params.push(`fps=${options.fps}`);
    if (options.no_mesh != null)
      params.push(`no_mesh=${options.no_mesh ? "true" : "false"}`);
    if (params.length) url += `?${params.join("&")}`;
    return url;
  }

  _buildCharacterOutput(
    result: Record<string, unknown>,
    ext: string
  ): CreateCharacterResult {
    const createChar = (result?.data as Record<string, unknown>)
      ?.create_character as Record<string, unknown>;
    const character = createChar?.character as Record<string, unknown>;
    const characterId = character?.id as string;
    const autoRigConf = createChar?.auto_rig_confidence as number | undefined;
    const url = `${this.baseUrl}/motion/bundle/${characterId}/character.${ext}`;
    return {
      url,
      character_id: characterId,
      auto_rig_confidence: autoRigConf ?? null,
    };
  }

  _prepareAndSelectTextToMotion(options: {
    model: ModelType;
    prompt: string;
    character_id?: string | null;
    foot_ik?: boolean | null;
    length?: number | null;
    cfg_scale?: number | null;
    seed?: number | null;
    internal_ik?: boolean | null;
  }): { mutation: string; variables: Record<string, unknown> } {
    let model = options.model;
    if (model === "auto") model = models.ttm.default;

    if (model === "vqvae-v1") {
      return {
        mutation: TEXT_TO_MOTION_VQVAE_V1,
        variables: {
          prompt: options.prompt,
          character_id: options.character_id,
          model: "text-to-motion",
          foot_ik: options.foot_ik,
        },
      };
    }
    if (model === "diffusion-v2") {
      return {
        mutation: TEXT_TO_MOTION_DIFFUSION_V2,
        variables: {
          prompt: options.prompt,
          character_id: options.character_id,
          model: "text-to-motion-bucmd",
          foot_ik: options.foot_ik,
          cfg_scale: options.cfg_scale,
          length: options.length,
          seed: options.seed,
          retargeting_ik: options.internal_ik,
        },
      };
    }
    throw new Error(
      `Unknown model: '${model}'. Must be 'auto', 'vqvae-v1', or 'diffusion-v2'.`
    );
  }

  /** Raw fetch for non-GraphQL requests (e.g. file downloads). Throws UthanaError on !ok. */
  async _fetch(
    url: string,
    init?: RequestInit
  ): Promise<{ arrayBuffer: () => Promise<ArrayBuffer> }> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: this._authHeader,
        ...init?.headers,
      },
      signal: AbortSignal.timeout(this.timeout * 1000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new UthanaError(res.status, text);
    }
    return {
      arrayBuffer: () => res.arrayBuffer(),
    };
  }
}
