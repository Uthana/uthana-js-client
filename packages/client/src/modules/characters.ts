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
import { DEFAULT_BYTE_UPLOAD_MAX } from "../types";
import { basename, detectMeshFormat, prepareCreateCharacter, validateUploadLimit } from "../utils";
import { BaseModule } from "./base";

type OnPreviewsReady = (
  previews: { key: string; url: string }[],
) => string | null | undefined | Promise<string | null | undefined>;

type CreateFromPromptParams = {
  prompt: string;
  name?: string | null;
  onPreviewsReady?: OnPreviewsReady;
};

/** Character management: upload, list, download, generate previews, rename, and delete. */
export class CharactersModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /**
   * Upload a GLB or FBX and optionally auto-rig. Returns `CreateCharacterResult`.
   */
  async createFromFile(
    file: File | Blob | string,
    options?: {
      auto_rig?: boolean | null;
      front_facing?: boolean | null;
      rerig_target?: string | null;
      include_fingers?: boolean | null;
      name?: string | null;
      timeoutSeconds?: number;
      max_bytes?: number | null;
    },
  ): Promise<CreateCharacterResult> {
    if (file === "" || (typeof file === "string" && !file.trim())) {
      throw new UthanaError(400, "file is required (.glb or .fbx)", "client");
    }
    validateUploadLimit(options?.max_bytes);
    return this._createFromFile(
      file,
      options?.auto_rig,
      options?.front_facing,
      options?.rerig_target,
      options?.include_fingers,
      options?.name,
      options?.timeoutSeconds,
      options?.max_bytes,
    );
  }

  /** Upload an existing byte snapshot without reopening its source file. */
  async createFromBytes(
    filename: string,
    content: ArrayBuffer | Uint8Array | Buffer,
    options?: {
      name?: string | null;
      auto_rig?: boolean | null;
      front_facing?: boolean | null;
      rerig_target?: string | null;
      include_fingers?: boolean | null;
      timeoutSeconds?: number;
      max_bytes?: number | null;
    },
  ): Promise<CreateCharacterResult> {
    const maxBytes = options?.max_bytes === undefined ? DEFAULT_BYTE_UPLOAD_MAX : options.max_bytes;
    validateUploadLimit(maxBytes);
    const bytes =
      content instanceof ArrayBuffer
        ? new Uint8Array(content)
        : content instanceof Uint8Array
          ? content
          : new Uint8Array(content);
    if (!bytes.byteLength) {
      throw new Error("Character upload content must be nonempty bytes");
    }
    if (maxBytes != null && bytes.byteLength > maxBytes) {
      throw new Error("Character upload exceeds max_bytes");
    }
    const name = basename(filename);
    const header = bytes.slice(0, 20);
    const detectedFormat = detectMeshFormat(header);
    const prepared = prepareCreateCharacter(
      name,
      options?.auto_rig ?? null,
      options?.front_facing ?? null,
      options?.rerig_target ?? null,
      options?.include_fingers ?? null,
      detectedFormat,
    );
    if (options?.name != null) {
      prepared.variables.name = options.name;
    }
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const result = await this._client._graphqlUpload<Record<string, unknown>>(
      CREATE_CHARACTER,
      prepared.variables,
      "file",
      blob,
      {
        filename: prepared.filename,
        timeoutSeconds: options?.timeoutSeconds ?? 360,
      },
    );
    return this._client._buildCharacterOutput(result, prepared.ext);
  }

  /** Get character rig metadata used to validate character-specific edits. */
  async metadata(
    character_id: string,
    options?: { max_bytes?: number | null },
  ): Promise<Record<string, unknown>> {
    const url = `${this._client.baseUrl}/motion/metadata/${encodeURIComponent(character_id)}`;
    const buf = await this._client._requestBytes(url, { maxBytes: options?.max_bytes });
    try {
      const text = new TextDecoder().decode(buf);
      const result = JSON.parse(text) as unknown;
      if (result == null || typeof result !== "object" || Array.isArray(result)) {
        throw new UthanaError(502, "Invalid character metadata response", "invalid_response");
      }
      return result as Record<string, unknown>;
    } catch (err) {
      if (err instanceof UthanaError) throw err;
      throw new UthanaError(502, "Invalid character metadata response", "invalid_response");
    }
  }

  async createFromPrompt(
    params: CreateFromPromptParams & { onPreviewsReady: OnPreviewsReady },
  ): Promise<CreateFromGeneratedImageResult>;
  async createFromPrompt(
    params: Omit<CreateFromPromptParams, "onPreviewsReady"> & { onPreviewsReady?: undefined },
  ): Promise<CharacterPreviewResult>;
  async createFromPrompt(
    params: CreateFromPromptParams,
  ): Promise<CharacterPreviewResult | CreateFromGeneratedImageResult> {
    if (!params.prompt?.trim()) {
      throw new UthanaError(400, "prompt is required", "client");
    }
    return this._generateFromText(params.prompt, params.name, params.onPreviewsReady);
  }

  /**
   * Upload a reference image (PNG/JPEG) and generate a character. Single-step; returns
   * `CreateFromGeneratedImageResult`.
   */
  async createFromImage(
    file: File | Blob | string,
    options?: { name?: string | null },
  ): Promise<CreateFromGeneratedImageResult> {
    if (file === "" || (typeof file === "string" && !file.trim())) {
      throw new UthanaError(400, "file is required (.png, .jpg, .jpeg)", "client");
    }
    return this._generateFromImage(file, options?.name);
  }

  /**
   * Finalize a character from a previously generated preview (step 2 of the two-step flow).
   * Use when `createFromPrompt` was called without `onPreviewsReady` and returned a
   * `CharacterPreviewResult`. Optionally supply `name` to name the character at finalization time.
   */
  async generateFromImage(
    pending: CharacterPreviewResult,
    imageKey: string,
    nameOrOptions?:
      | string
      | null
      | {
          name?: string | null;
          include_fingers?: boolean | null;
          timeoutSeconds?: number;
        },
  ): Promise<CreateFromGeneratedImageResult> {
    const options =
      nameOrOptions == null || typeof nameOrOptions === "string"
        ? { name: nameOrOptions ?? null }
        : nameOrOptions;
    return this._finalizeFromImage(
      pending.character_id,
      imageKey,
      options.name,
      pending.prompt,
      options.include_fingers,
      options.timeoutSeconds ?? 660,
    );
  }

  /**
   * Upload an image snapshot and prepare a reference for character generation.
   * Persist the returned character ID and image key before calling generateFromImage.
   */
  async prepareFromImageBytes(
    filename: string,
    content: ArrayBuffer | Uint8Array | Buffer,
    options?: { max_bytes?: number; timeoutSeconds?: number },
  ): Promise<CharacterPreviewResult> {
    const maxBytes = options?.max_bytes ?? 16 * 1024 * 1024;
    if (!Number.isInteger(maxBytes) || maxBytes < 1) {
      throw new Error("Image snapshots require a positive max_bytes limit");
    }
    const lower = filename.toLowerCase();
    if (!lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".jpeg")) {
      throw new Error("Choose a PNG or JPEG filename");
    }
    const bytes =
      content instanceof ArrayBuffer
        ? new Uint8Array(content)
        : content instanceof Uint8Array
          ? content
          : new Uint8Array(content);
    if (!bytes.byteLength || bytes.byteLength > maxBytes) {
      throw new Error("Image snapshot must be nonempty bytes and fit max_bytes");
    }
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const data = await this._client._graphqlUpload<{
      character_id?: string;
      image?: { key?: string; url?: string };
    }>(CREATE_IMAGE_FROM_IMAGE, {}, "file", blob, {
      path: "create_image_from_image",
      filename: basename(filename),
      timeoutSeconds: options?.timeoutSeconds ?? 360,
    });
    const characterId = data?.character_id;
    const image = data?.image;
    if (
      typeof characterId !== "string" ||
      !characterId ||
      !image ||
      typeof image.key !== "string" ||
      !image.key
    ) {
      throw new UthanaError(502, "Invalid prepared image response", "invalid_response");
    }
    return { character_id: characterId, previews: [image as { key: string; url: string }], prompt: "" };
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
    options?: { output_format?: OutputFormat; max_bytes?: number | null },
  ): Promise<ArrayBuffer> {
    const fmt = (options?.output_format ?? "glb").toLowerCase();
    const url = `${this._client.baseUrl}/motion/bundle/${encodeURIComponent(character_id)}/character.${fmt}`;
    return this._client._requestBytes(url, { maxBytes: options?.max_bytes });
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
    rerig_target?: string | null,
    include_fingers?: boolean | null,
    name?: string | null,
    timeoutSeconds?: number,
    max_bytes?: number | null,
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
        if (max_bytes != null && buf.byteLength > max_bytes) {
          throw new Error("Character upload exceeds max_bytes");
        }
        const header = new Uint8Array(buf.buffer, buf.byteOffset, 20);
        detectedFormat = detectMeshFormat(header);
        blob = new Blob([buf], { type: "application/octet-stream" });
      } catch (err) {
        if (err instanceof Error && err.message.includes("max_bytes")) throw err;
        blob = new Blob([], { type: "application/octet-stream" });
      }
      const prepared = prepareCreateCharacter(
        file,
        auto_rig ?? null,
        front_facing ?? null,
        rerig_target ?? null,
        include_fingers ?? null,
        detectedFormat,
      );
      variables = prepared.variables;
      ext = prepared.ext;
      uploadFilename = prepared.filename;
    } else {
      const filename = file instanceof File ? file.name : "character.glb";
      let detectedFormat: "glb" | "fbx" | null = null;
      if (file instanceof Blob) {
        if (max_bytes != null && file.size > max_bytes) {
          throw new Error("Character upload exceeds max_bytes");
        }
        const header = new Uint8Array(await file.slice(0, 20).arrayBuffer());
        detectedFormat = detectMeshFormat(header);
      }
      blob = file instanceof Blob ? file : new Blob([], { type: "application/octet-stream" });
      const prepared = prepareCreateCharacter(
        filename,
        auto_rig ?? null,
        front_facing ?? null,
        rerig_target ?? null,
        include_fingers ?? null,
        detectedFormat,
      );
      variables = prepared.variables;
      ext = prepared.ext;
      uploadFilename = prepared.filename;
    }

    if (name != null) variables.name = name;

    const result = await this._client._graphqlUpload<Record<string, unknown>>(
      CREATE_CHARACTER,
      variables,
      "file",
      blob,
      { filename: uploadFilename, timeoutSeconds: timeoutSeconds ?? 360 },
    );

    return this._client._buildCharacterOutput(result, ext);
  }

  /** CREATE_IMAGE_FROM_TEXT → optional callback/two-step → _finalizeFromImage. */
  private async _generateFromText(
    prompt: string,
    name?: string | null,
    onPreviewsReady?: OnPreviewsReady,
  ): Promise<CharacterPreviewResult | CreateFromGeneratedImageResult> {
    const { character_id, images } = await this._client._graphql<{
      character_id: string;
      images: { key: string; url: string }[];
    }>(CREATE_IMAGE_FROM_TEXT, { prompt }, { path: "create_image_from_text" });
    if (!onPreviewsReady) {
      return { character_id, previews: images ?? [], prompt };
    }
    const key = await onPreviewsReady(images ?? []);
    if (!key) throw new UthanaError(400, "No preview image selected", "client");
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
    }>(CREATE_IMAGE_FROM_IMAGE, {}, "file", fileValue, {
      path: "create_image_from_image",
      filename: uploadFilename,
    });
    return this._finalizeFromImage(character_id, image.key, name);
  }

  /** CREATE_CHARACTER_FROM_IMAGE — shared finalization step. */
  private async _finalizeFromImage(
    character_id: string,
    image_key: string,
    name?: string | null,
    prompt?: string | null,
    include_fingers?: boolean | null,
    timeoutSeconds?: number,
  ): Promise<CreateFromGeneratedImageResult> {
    const result = await this._client._graphql<CreateFromGeneratedImageResult>(
      CREATE_CHARACTER_FROM_IMAGE,
      {
        character_id,
        image_key,
        prompt: prompt ?? "",
        name: name ?? null,
        include_fingers: include_fingers ?? null,
      },
      { path: "create_character_from_image", timeoutSeconds },
    );
    return { character: result.character, auto_rig_confidence: result.auto_rig_confidence ?? null };
  }
}
