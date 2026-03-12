/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CharacterPreviewResult,
  CreateCharacterResult,
  CreateFromGeneratedImageResult,
} from "@uthana/client";
import { useCallback, useRef, useState } from "react";
import { useUthanaClient } from "../UthanaProvider";

const CHARACTERS_QUERY_KEY = ["uthana", "characters"] as const;

/** Hook to list characters. */
export function useUthanaCharacters() {
  const client = useUthanaClient();
  const { data: characters, ...rest } = useQuery({
    queryKey: CHARACTERS_QUERY_KEY,
    queryFn: () => client.characters.list(),
  });
  return { characters, ...rest };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Preview = { key: string; url: string };

type GenerateParams =
  | {
      from: "prompt";
      prompt: string;
      name?: string | null;
      /** Return a preview key to auto-confirm without waiting for manual confirm(). */
      onPreviewsReady?: (
        previews: Preview[],
      ) => string | null | undefined | Promise<string | null | undefined>;
    }
  | {
      /**
       * Upload an image file and generate a character from it.
       * Always single-step — resolves directly to a finished character.
       * No prompt or preview selection required.
       */
      from: "image";
      file: File | Blob;
      name?: string | null;
    };

type CreateFileParams = {
  from: "file";
  file: File | Blob | string;
  auto_rig?: boolean | null;
  front_facing?: boolean | null;
};

type ConfirmParams = {
  image_key: string;
  /** Optionally name the character at confirmation time. */
  name?: string | null;
};

type CreateCharacterData = CreateCharacterResult | CreateFromGeneratedImageResult;

type CreateCharacterStatus =
  | "idle"
  | "generating"
  | "awaiting_selection"
  | "creating"
  | "success"
  | "error";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Unified hook for all character creation flows:
 *
 * **File upload (GLB/FBX)** — single step:
 * ```ts
 * creator.create({ from: "file", file });
 * ```
 *
 * **Text prompt** — two steps. Call generate(), then either:
 * - let `onPreviewsReady` auto-select a key and complete automatically, or
 * - render `creator.previews`, then call `creator.confirm({ image_key })`.
 *
 * ```ts
 * // Auto-select first preview
 * creator.generate({ from: "prompt", prompt: "a knight in armor",
 *   onPreviewsReady: (previews) => previews[0].key });
 *
 * // Manual selection
 * creator.generate({ from: "prompt", prompt: "a knight" });
 * // ... render creator.previews, user picks one ...
 * creator.confirm({ image_key: selected });
 * ```
 *
 * **Image file** — single step (no preview selection):
 * ```ts
 * creator.generate({ from: "image", file });
 * ```
 */
export function useUthanaCreateCharacter() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<CreateCharacterStatus>("idle");
  const [character, setCharacter] = useState<CreateCharacterData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [previews, setPreviews] = useState<Preview[] | null>(null);

  // Stored between generate({ from: "prompt" }) and confirm()
  const intermediateRef = useRef<CharacterPreviewResult | null>(null);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CHARACTERS_QUERY_KEY });
  }, [queryClient]);

  const reset = useCallback(() => {
    setStatus("idle");
    setCharacter(null);
    setError(null);
    setPreviews(null);
    intermediateRef.current = null;
  }, []);

  /**
   * Step 2 of the text-prompt flow — finalize using a selected preview key.
   * Only valid after `generate({ from: "prompt" })` has been called.
   */
  const confirm = useCallback(
    async (params: ConfirmParams) => {
      const intermediate = intermediateRef.current;
      if (!intermediate) {
        throw new Error("No pending generation. Call generate() first.");
      }
      setStatus("creating");
      try {
        const result = await client.characters.generateFromImage(
          intermediate,
          params.image_key,
          params.name,
        );
        setCharacter(result);
        setStatus("success");
        intermediateRef.current = null;
        setPreviews(null);
        invalidate();
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      }
    },
    [client, invalidate],
  );

  /**
   * Start a generation flow:
   * - `from: "prompt"` — generates preview images; either auto-confirms via `onPreviewsReady`
   *   or waits for a manual `confirm()` call.
   * - `from: "image"` — uploads an image file and creates the character in one step.
   */
  const generate = useCallback(
    async (params: GenerateParams) => {
      setStatus("generating");
      setError(null);
      setPreviews(null);
      intermediateRef.current = null;
      try {
        if (params.from === "prompt") {
          const pending = await client.characters.create({
            prompt: params.prompt,
            name: params.name,
          });
          intermediateRef.current = pending as CharacterPreviewResult;
          const generatedPreviews = (pending as CharacterPreviewResult).previews ?? [];
          setPreviews(generatedPreviews);
          setStatus("awaiting_selection");

          if (params.onPreviewsReady) {
            const selectedKey = await params.onPreviewsReady(generatedPreviews);
            if (selectedKey) {
              await confirm({ image_key: selectedKey, name: params.name });
            }
          }
        } else {
          // from: "image" — always single-step, no previews
          const result = await client.characters.create({
            method: "image",
            file: params.file,
            name: params.name,
          });
          setCharacter(result as CreateFromGeneratedImageResult);
          setStatus("success");
          invalidate();
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      }
    },
    [client, confirm, invalidate],
  );

  /** Single-step GLB/FBX upload. */
  const create = useCallback(
    async (params: CreateFileParams) => {
      setStatus("creating");
      setError(null);
      try {
        const result = await client.characters.create({
          file: params.file,
          auto_rig: params.auto_rig,
          front_facing: params.front_facing,
        });
        setCharacter(result);
        setStatus("success");
        invalidate();
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      }
    },
    [client, invalidate],
  );

  return {
    /** Start a text-prompt or image generation flow. */
    generate,
    /** Confirm a generated preview and create the character (step 2 of the prompt flow). */
    confirm,
    /** Upload a GLB/FBX directly (single step). */
    create,
    /** Preview images from a prompt generation. Render for user selection, then call confirm(). */
    previews,
    /** True while generate() or create()/confirm() are in flight. */
    isPending: status === "generating" || status === "creating",
    isGenerating: status === "generating",
    /** True after prompt generate() completes and previews are ready for selection. */
    isAwaitingSelection: status === "awaiting_selection",
    isCreating: status === "creating",
    isSuccess: status === "success",
    isError: status === "error",
    /** Final result — CreateCharacterResult (file) or CreateFromGeneratedImageResult (generate flows). */
    character,
    error,
    /** Reset all state back to idle. */
    reset,
  };
}

/** Hook to rename a character. */
export function useUthanaRenameCharacter() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { character_id: string; name: string }) =>
      client.characters.rename(params.character_id, params.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTERS_QUERY_KEY });
    },
  });
}

/** Hook to delete a character. */
export function useUthanaDeleteCharacter() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { character_id: string }) => client.characters.delete(params.character_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTERS_QUERY_KEY });
    },
  });
}
