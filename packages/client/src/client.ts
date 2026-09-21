/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { Graffle } from "graffle";
import { Throws } from "graffle/extensions/throws";
import { UthanaError } from "./errors";
import { CREATE_T2M } from "./graphql";
import { models, normalizeModelName } from "./models";
import { CharactersModule } from "./modules/characters";
import { JobsModule } from "./modules/jobs";
import { MotionDownloadsModule } from "./modules/motionDownloads";
import { MotionsModule } from "./modules/motions";
import { OrgModule } from "./modules/org";
import { TtmModule } from "./modules/ttm";
import { VtmModule } from "./modules/vtm";
import type { CreateCharacterResult, ModelType, OutputFormat } from "./types";
import { DEFAULT_TIMEOUT } from "./types";

/** Options for UthanaClient construction. */
export interface UthanaClientOptions {
  /** API host (e.g. "uthana.com"). Defaults to production when omitted. */
  domain?: string;
  /** Request timeout in seconds. */
  timeout?: number;
  /** Maximum decoded GraphQL query response size; omit for unlimited. */
  maxResponseBytes?: number | null;
  /**
   * Optional bound for GraphQL mutation responses. Overflow after a successful HTTP
   * response raises kind="uncertain" (do not blindly resubmit).
   */
  maxMutationResponseBytes?: number | null;
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
  private readonly _maxResponseBytes: number | null;
  private readonly _maxMutationResponseBytes: number | null;

  readonly ttm: TtmModule;
  readonly vtm: VtmModule;
  readonly characters: CharactersModule;
  readonly motions: MotionsModule;
  readonly motionDownloads: MotionDownloadsModule;
  readonly org: OrgModule;
  readonly jobs: JobsModule;

  private readonly _graffle: {
    gql: (query: string) => { $send: (vars?: Record<string, unknown>) => Promise<unknown> };
  };
  private readonly _authHeader: string;

  constructor(
    public readonly apiKey: string,
    options: UthanaClientOptions = {},
  ) {
    const domain = options.domain ?? "uthana.com";
    this.baseUrl = `https://${domain}`;
    this.graphqlUrl = `${this.baseUrl}/graphql`;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this._maxResponseBytes = options.maxResponseBytes ?? null;
    this._maxMutationResponseBytes = options.maxMutationResponseBytes ?? null;
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
      .use(Throws);

    this.ttm = new TtmModule(this);
    this.vtm = new VtmModule(this);
    this.characters = new CharactersModule(this);
    this.motions = new MotionsModule(this);
    this.motionDownloads = new MotionDownloadsModule(this);
    this.org = new OrgModule(this);
    this.jobs = new JobsModule(this);
  }

  /** Execute a GraphQL query (async). Optionally extract path from data. Supports Blob/File in variables for uploads. */
  async _graphql<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
    options?: {
      path?: string;
      pathDefault?: unknown;
      /** Override request timeout in seconds. */
      timeoutSeconds?: number;
    },
  ): Promise<T> {
    const mutating = /^\s*mutation\b/i.test(query);
    const doc = this._graffle.gql(query);
    const result = (await doc.$send(variables)) as Record<string, unknown>;
    const encoded = JSON.stringify(result);
    const limit = mutating ? this._maxMutationResponseBytes : this._maxResponseBytes;
    if (limit != null && encoded.length > limit) {
      throw new UthanaError(
        502,
        mutating
          ? "Mutation response exceeded maxMutationResponseBytes; the operation may have succeeded. Inspect existing work before resubmitting."
          : "Query response exceeded maxResponseBytes",
        mutating ? "uncertain" : "response_too_large",
      );
    }
    const data = (result?.data ?? result) as Record<string, unknown>;

    if (options?.path) {
      const parts = options.path.split(".");
      let out: unknown = data;
      for (const key of parts) {
        out = (out as Record<string, unknown>)?.[key];
      }
      if (out === undefined) {
        return (options.pathDefault ?? {}) as T;
      }
      return out as T;
    }
    return data as T;
  }

  /**
   * Execute a GraphQL mutation with a single file upload using the multipart request spec.
   * Uses fetch directly so the Authorization header is always forwarded correctly.
   * @param variablePath - dot-path of the file variable (e.g. "file")
   */
  async _graphqlUpload<T = unknown>(
    query: string,
    variables: Record<string, unknown>,
    variablePath: string,
    blob: Blob,
    options?: {
      path?: string;
      pathDefault?: unknown;
      filename?: string;
      /** Override request timeout in seconds. */
      timeoutSeconds?: number;
    },
  ): Promise<T> {
    const nulledVars = { ...variables, [variablePath]: null };
    const form = new FormData();
    form.append("operations", JSON.stringify({ query, variables: nulledVars }));
    form.append("map", JSON.stringify({ "0": [`variables.${variablePath}`] }));
    form.append("0", blob, options?.filename);

    const timeoutSeconds = options?.timeoutSeconds ?? this.timeout;
    const res = await fetch(this.graphqlUrl, {
      method: "POST",
      headers: { Authorization: this._authHeader },
      body: form,
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    });

    if (!res.ok) {
      throw new UthanaError(res.status, await res.text(), "http");
    }

    const json = (await res.json()) as Record<string, unknown>;
    if (json.errors) {
      const errs = json.errors as Array<{ message: string }>;
      throw new UthanaError(400, errs[0]?.message ?? "GraphQL error", "graphql");
    }

    const data = (json.data ?? json) as Record<string, unknown>;
    if (options?.path) {
      const parts = options.path.split(".");
      let out: unknown = data;
      for (const key of parts) {
        out = (out as Record<string, unknown>)?.[key];
      }
      if (out === undefined) {
        return (options.pathDefault ?? {}) as T;
      }
      return out as T;
    }
    return data as T;
  }

  _motionUrl(options: {
    character_id: string;
    motion_id: string;
    output_format: OutputFormat;
    fps?: number | null;
    no_mesh?: boolean | null;
    in_place?: boolean | null;
    roblox_compatible?: boolean | null;
    speed_multiplier?: number | null;
    torso_only?: boolean | null;
  }): string {
    const ext = options.output_format.toLowerCase();
    let url = `${this.baseUrl}/motion/file/motion_viewer/${options.character_id}/${options.motion_id}/${ext}/${options.character_id}-${options.motion_id}.${ext}`;
    const params: string[] = [];
    if (options.fps != null) params.push(`fps=${options.fps}`);
    if (options.no_mesh != null) params.push(`no_mesh=${options.no_mesh ? "true" : "false"}`);
    for (const [key, value] of [
      ["in_place", options.in_place],
      ["roblox_compatible", options.roblox_compatible],
      ["torso_only", options.torso_only],
    ] as const) {
      if (value != null) params.push(`${key}=${value ? "true" : "false"}`);
    }
    if (options.speed_multiplier != null)
      params.push(`speed_multiplier=${options.speed_multiplier}`);
    if (params.length) url += `?${params.join("&")}`;
    return url;
  }

  _buildCharacterOutput(result: Record<string, unknown>, ext: string): CreateCharacterResult {
    const createChar = (result?.data as Record<string, unknown>)?.create_character as Record<
      string,
      unknown
    >;
    const character = createChar?.character as Record<string, unknown>;
    const characterId = character?.id as string;
    const autoRigConf = createChar?.auto_rig_confidence as number | undefined;
    const message = createChar?.message as string | undefined;
    const url = `${this.baseUrl}/motion/bundle/${characterId}/character.${ext}`;
    return {
      url,
      character_id: characterId,
      auto_rig_confidence: autoRigConf ?? null,
      message: message ?? null,
    };
  }

  /** Resolve model to server string and build CreateT2m variables. */
  _prepareTextToMotion(options: {
    model: ModelType;
    prompt: string;
    character_id?: string | null;
    foot_ik?: boolean | null;
    enhance_prompt?: boolean | null;
    steps?: number | null;
    length?: number | null;
    cfg_scale?: number | null;
    seed?: number | null;
    internal_ik?: boolean | null;
  }): { mutation: string; variables: Record<string, unknown> } {
    let model = options.model;
    if (model === "auto") model = models.ttm.default;

    const serverModel = normalizeModelName(model as string);

    return {
      mutation: CREATE_T2M,
      variables: {
        prompt: options.prompt,
        character_id: options.character_id,
        model: serverModel,
        foot_ik: options.foot_ik,
        enhance_prompt: options.enhance_prompt,
        steps: options.steps,
        cfg_scale: options.cfg_scale,
        length: options.length,
        seed: options.seed,
        retargeting_ik: options.internal_ik,
      },
    };
  }

  /** Raw fetch for non-GraphQL requests (e.g. file downloads). Throws UthanaError on !ok. */
  async _fetch(
    url: string,
    init?: RequestInit & { timeoutSeconds?: number },
  ): Promise<{ arrayBuffer: () => Promise<ArrayBuffer>; text: () => Promise<string> }> {
    const { timeoutSeconds, ...rest } = init ?? {};
    const res = await fetch(url, {
      ...rest,
      headers: {
        Authorization: this._authHeader,
        ...rest?.headers,
      },
      signal: AbortSignal.timeout((timeoutSeconds ?? this.timeout) * 1000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new UthanaError(res.status, text, "http");
    }
    return {
      arrayBuffer: () => res.arrayBuffer(),
      text: () => res.text(),
    };
  }

  /** Fetch bytes with an optional response size bound. */
  async _requestBytes(
    url: string,
    options?: { maxBytes?: number | null; timeoutSeconds?: number },
  ): Promise<ArrayBuffer> {
    const res = await this._fetch(url, { timeoutSeconds: options?.timeoutSeconds });
    const buf = await res.arrayBuffer();
    if (options?.maxBytes != null && buf.byteLength > options.maxBytes) {
      throw new UthanaError(502, "Response exceeded maxBytes", "response_too_large");
    }
    return buf;
  }
}
