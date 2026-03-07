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
  CREATE_MOTION_FROM_GLTF,
  DELETE_CHARACTER,
  LIST_CHARACTERS,
  RENAME_CHARACTER,
} from "../graphql";
import type {
  Character,
  CreateCharacterResult,
  CreateFromGeneratedImageResult,
  GenerateFromImageResult,
  GenerateFromTextResult,
  OutputFormat,
  TextToMotionResult,
} from "../types";
import { UthanaCharacters } from "../types";
import { detectMeshFormat, prepareCreateCharacter } from "../utils";
import { BaseModule } from "./base";

/** Character management: upload, list, download, and create motions from GLTF. */
export class CharactersModule extends BaseModule {
  constructor(client: UthanaClient) {
    super(client);
  }

  /** Upload and optionally auto-rig a 3D character model. */
  async create(
    file: File | Blob | string,
    options?: {
      auto_rig?: boolean | null;
      front_facing?: boolean | null;
    },
  ): Promise<CreateCharacterResult> {
    let variables: Record<string, unknown>;
    let ext: string;
    let blob: Blob;

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
        options?.auto_rig ?? null,
        options?.front_facing ?? null,
        detectedFormat,
      );
      variables = { ...prepared.variables, file: blob };
      ext = prepared.ext;
    } else {
      const filename = file instanceof File ? file.name : "character.glb";
      let detectedFormat: "glb" | "fbx" | null = null;
      if (file instanceof Blob) {
        const header = new Uint8Array(await file.slice(0, 20).arrayBuffer());
        detectedFormat = detectMeshFormat(header);
      }
      const prepared = prepareCreateCharacter(
        filename,
        options?.auto_rig ?? null,
        options?.front_facing ?? null,
        detectedFormat,
      );
      variables = { ...prepared.variables, file };
      ext = prepared.ext;
    }

    const result = (await this._client._graphql<Record<string, unknown>>(
      CREATE_CHARACTER,
      variables,
      { path: "create_character" },
    )) as Record<string, unknown>;

    return this._client._buildCharacterOutput(
      { data: { create_character: result } } as Record<string, unknown>,
      ext,
    );
  }

  /** List all characters for the authenticated user. */
  async list(): Promise<Character[]> {
    return this._client._graphql<Character[]>(
      LIST_CHARACTERS,
      {},
      {
        path: "characters",
        pathDefault: [],
      },
    );
  }

  /** Generate character preview images from a text prompt. Returns character_id and images. */
  async generate_from_text(prompt: string): Promise<GenerateFromTextResult> {
    const result = (await this._client._graphql<Record<string, unknown>>(
      CREATE_IMAGE_FROM_TEXT,
      { prompt },
      { path: "create_image_from_text" },
    )) as unknown as GenerateFromTextResult;
    return {
      character_id: result.character_id,
      images: result.images ?? [],
    };
  }

  /** Generate a character preview image from an uploaded image file. Returns character_id and image. */
  async generate_from_image(file: File | Blob): Promise<GenerateFromImageResult> {
    const result = (await this._client._graphql<Record<string, unknown>>(
      CREATE_IMAGE_FROM_IMAGE,
      { file },
      { path: "create_image_from_image" },
    )) as unknown as GenerateFromImageResult;
    return {
      character_id: result.character_id,
      image: result.image,
    };
  }

  /** Create a character from a previously generated image (from generate_from_text or generate_from_image). */
  async create_from_generated_image(
    character_id: string,
    image_key: string,
    prompt: string,
    options?: { name?: string | null },
  ): Promise<CreateFromGeneratedImageResult> {
    const result = (await this._client._graphql<Record<string, unknown>>(
      CREATE_CHARACTER_FROM_IMAGE,
      {
        character_id,
        image_key,
        prompt,
        name: options?.name ?? null,
      },
      { path: "create_character_from_image" },
    )) as unknown as CreateFromGeneratedImageResult;
    return {
      character: result.character,
      auto_rig_confidence: result.auto_rig_confidence ?? null,
    };
  }

  /** Rename a character by ID. */
  async rename(character_id: string, name: string): Promise<Character> {
    const result = await this._client._graphql<Record<string, unknown>>(
      RENAME_CHARACTER,
      { character_id, name },
      { path: "update_character.character" },
    );
    return result as Character;
  }

  /** Soft-delete a character by ID. */
  async delete(character_id: string): Promise<Character> {
    const result = await this._client._graphql<Record<string, unknown>>(
      DELETE_CHARACTER,
      { character_id },
      { path: "update_character.character" },
    );
    return result as Character;
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

  /** Upload GLTF content as a new motion. Returns motion_id and character_id. */
  async create_from_gltf(
    gltf_content: string,
    motion_name: string,
    options?: { character_id?: string | null },
  ): Promise<TextToMotionResult> {
    const charId = options?.character_id ?? UthanaCharacters.tar;
    const result = (await this._client._graphql<Record<string, unknown>>(
      CREATE_MOTION_FROM_GLTF,
      {
        gltf: gltf_content,
        motionName: motion_name,
        characterId: charId,
      },
      { path: "create_motion_from_gltf" },
    )) as Record<string, unknown>;

    const motion = result?.motion as Record<string, unknown> | undefined;
    const motionId = motion?.id as string | undefined;
    if (!motionId) {
      throw new UthanaError(400, "create_motion_from_gltf did not return motion id");
    }
    return { character_id: charId, motion_id: motionId };
  }
}
