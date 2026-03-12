/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import type { UthanaClient } from "../client";
import { UthanaError } from "../errors";
import {
  CREATE_CHARACTER,
  CREATE_CHARACTER_FROM_IMAGE,
  CREATE_IMAGE_FROM_IMAGE,
  CREATE_IMAGE_FROM_TEXT,
  DELETE_CHARACTER,
  LIST_CHARACTERS,
  RENAME_CHARACTER,
} from "../graphql";
import type {
  Character,
  CharacterPreviewResult,
  CreateCharacterResult,
  CreateFromGeneratedImageResult,
  OutputFormat,
} from "../types";
import { detectMeshFormat, prepareCreateCharacter } from "../utils";
import { BaseModule } from "./base";

type CreateFileParams = {
  method?: "file";
  file: File | Blob | string;
  prompt?: never;
  auto_rig?: boolean | null;
  front_facing?: boolean | null;
};

type CreatePromptParams = {
  method?: "prompt";
  prompt: string;
  file?: never;
  name?: string | null;
  onPreviewsReady?: (
    previews: { key: string; url: string }[],
  ) => string | null | undefined | Promise<string | null | undefined>;
};

type CreateImageParams = {
  method?: "image";
  file: File | Blob | string;
  name?: string | null;
};

type CreateParams = CreateFileParams | CreatePromptParams | CreateImageParams;

/** Character management: upload, list, download, generate previews, rename, and delete. */
export class CharactersModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /**
   * Create a character.
   *
   * The `method` field is optional and inferred from the params you pass:
   * - `file` only (or `method: "file"`) — upload a GLB/FBX and optionally auto-rig.
   *   Returns `CreateCharacterResult`.
   * - `prompt` only (or `method: "prompt"`) — generate from a text prompt. With `onPreviewsReady`,
   *   calls it with the preview images and uses the returned key to finalize; returns
   *   `CreateFromGeneratedImageResult`. Without it, returns a `CharacterPreviewResult` to inspect
   *   and confirm via `generateFromImage()`.
   * - `file` + `prompt` (or `method: "image"`) — upload an image file and generate a character
   *   from it. Always returns `CreateFromGeneratedImageResult` directly.
   */
  async create(params: CreateFileParams): Promise<CreateCharacterResult>;
  async create(
    params: CreatePromptParams & {
      onPreviewsReady: NonNullable<CreatePromptParams["onPreviewsReady"]>;
    },
  ): Promise<CreateFromGeneratedImageResult>;
  async create(
    params: Omit<CreatePromptParams, "onPreviewsReady"> & { onPreviewsReady?: undefined },
  ): Promise<CharacterPreviewResult>;
  async create(params: CreateImageParams): Promise<CreateFromGeneratedImageResult>;
  async create(
    params: CreateParams,
  ): Promise<CreateCharacterResult | CharacterPreviewResult | CreateFromGeneratedImageResult> {
    const { method, file, prompt, name, auto_rig, front_facing, onPreviewsReady } =
      params as CreateFileParams & CreatePromptParams & CreateImageParams;
    const resolved = method ?? (prompt ? "prompt" : "file");
    if (resolved === "file") {
      return this._createFromFile(file, auto_rig, front_facing);
    }
    if (resolved === "prompt") {
      return this._generateFromText(prompt, name, onPreviewsReady);
    }
    return this._generateFromImage(file, name);
  }

  /**
   * Finalize a character from a previously generated preview (step 2 of the two-step flow).
   * Use when `create()` was called without `onPreviewsReady` and returned a `CharacterPreviewResult`.
   * Optionally supply `name` to name the character at finalization time.
   */
  async generateFromImage(
    pending: CharacterPreviewResult,
    imageKey: string,
    name?: string | null,
  ): Promise<CreateFromGeneratedImageResult> {
    return this._finalizeFromImage(pending.character_id, imageKey, name, pending.prompt);
  }

  /** List all characters for the authenticated user. */
  async list(): Promise<Character[]> {
    return this._client._graphql<Character[]>(
      LIST_CHARACTERS,
      {},
      { path: "characters", pathDefault: [] },
    );
  }

  /** Download a character model in the requested format. */
  async download(
    character_id: string,
    options?: { output_format?: OutputFormat },
  ): Promise<ArrayBuffer> {
    const fmt = (options?.output_format ?? "glb").toLowerCase();
    const url = `${this._client.baseUrl}/motion/bundle/${character_id}/character.${fmt}`;
    const res = await this._client._fetch(url);
    return res.arrayBuffer();
  }

  /** Rename a character by ID. */
  async rename(character_id: string, name: string): Promise<Character> {
    return this._client._graphql<Character>(
      RENAME_CHARACTER,
      { character_id, name },
      { path: "update_character.character" },
    );
  }

  /** Soft-delete a character by ID. */
  async delete(character_id: string): Promise<Character> {
    return this._client._graphql<Character>(
      DELETE_CHARACTER,
      { character_id },
      { path: "update_character.character" },
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers — one per GQL call (or combined where always sequential)
  // ---------------------------------------------------------------------------

  private async _createFromFile(
    file: File | Blob | string,
    auto_rig?: boolean | null,
    front_facing?: boolean | null,
  ): Promise<CreateCharacterResult> {
    let variables: Record<string, unknown>;
    let ext: string;
    let blob: Blob;

    let uploadFilename: string;

    if (typeof file === "string") {
      let detectedFormat: "glb" | "fbx" | null = null;
      try {
        const mod = await import("node:fs/promises");
        const buf = await mod.readFile(file);
        const header = new Uint8Array(buf.buffer, buf.byteOffset, 20);
        detectedFormat = detectMeshFormat(header);
        blob = new Blob([buf], { type: "application/octet-stream" });
      } catch {
        blob = new Blob([], { type: "application/octet-stream" });
      }
      const prepared = prepareCreateCharacter(
        file,
        auto_rig ?? null,
        front_facing ?? null,
        detectedFormat,
      );
      variables = prepared.variables;
      ext = prepared.ext;
      uploadFilename = prepared.filename;
    } else {
      const filename = file instanceof File ? file.name : "character.glb";
      let detectedFormat: "glb" | "fbx" | null = null;
      if (file instanceof Blob) {
        const header = new Uint8Array(await file.slice(0, 20).arrayBuffer());
        detectedFormat = detectMeshFormat(header);
      }
      blob = file instanceof Blob ? file : new Blob([], { type: "application/octet-stream" });
      const prepared = prepareCreateCharacter(
        filename,
        auto_rig ?? null,
        front_facing ?? null,
        detectedFormat,
      );
      variables = prepared.variables;
      ext = prepared.ext;
      uploadFilename = prepared.filename;
    }

    const result = await this._client._graphqlUpload<Record<string, unknown>>(
      CREATE_CHARACTER,
      variables,
      "file",
      blob,
      { filename: uploadFilename },
    );

    return this._client._buildCharacterOutput(result, ext);
  }

  /** CREATE_IMAGE_FROM_TEXT → optional callback/two-step → _finalizeFromImage. */
  private async _generateFromText(
    prompt: string,
    name?: string | null,
    onPreviewsReady?: CreatePromptParams["onPreviewsReady"],
  ): Promise<CharacterPreviewResult | CreateFromGeneratedImageResult> {
    const { character_id, images } = await this._client._graphql<{
      character_id: string;
      images: { key: string; url: string }[];
    }>(CREATE_IMAGE_FROM_TEXT, { prompt }, { path: "create_image_from_text" });
    if (!onPreviewsReady) {
      return { character_id, previews: images ?? [], prompt };
    }
    const key = await onPreviewsReady(images ?? []);
    if (!key) throw new UthanaError(400, "No preview image selected");
    return this._finalizeFromImage(character_id, key, name, prompt);
  }

  /** CREATE_IMAGE_FROM_IMAGE → _finalizeFromImage. Always single-step. */
  private async _generateFromImage(
    file: File | Blob | string,
    name?: string | null,
  ): Promise<CreateFromGeneratedImageResult> {
    let fileValue: File | Blob;
    let uploadFilename: string;
    if (typeof file === "string") {
      try {
        const mod = await import("node:fs/promises");
        const buf = await mod.readFile(file);
        fileValue = new Blob([buf], { type: "application/octet-stream" });
      } catch {
        fileValue = new Blob([], { type: "application/octet-stream" });
      }
      uploadFilename = file.split("/").pop() ?? "image.png";
    } else {
      fileValue = file;
      uploadFilename = file instanceof File ? file.name : "image.png";
    }
    const { character_id, image } = await this._client._graphqlUpload<{
      character_id: string;
      image: { key: string; url: string };
    }>(CREATE_IMAGE_FROM_IMAGE, {}, "file", fileValue, { path: "create_image_from_image", filename: uploadFilename });
    return this._finalizeFromImage(character_id, image.key, name);
  }

  /** CREATE_CHARACTER_FROM_IMAGE — shared finalization step. */
  private async _finalizeFromImage(
    character_id: string,
    image_key: string,
    name?: string | null,
    prompt?: string | null,
  ): Promise<CreateFromGeneratedImageResult> {
    const result = await this._client._graphql<CreateFromGeneratedImageResult>(
      CREATE_CHARACTER_FROM_IMAGE,
      { character_id, image_key, prompt: prompt ?? "", name: name ?? null },
      { path: "create_character_from_image" },
    );
    return { character: result.character, auto_rig_confidence: result.auto_rig_confidence ?? null };
  }
}
