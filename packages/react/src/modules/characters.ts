/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCharacterResult, CreateFromGeneratedImageResult } from "@uthana/client";
import { useCallback, useRef, useState } from "react";
import { useUthanaClient } from "../UthanaProvider";

const CHARACTERS_QUERY_KEY = ["uthana", "characters"] as const;

/** Hook to list characters. */
export function useUthanaCharacters() {
  const client = useUthanaClient();
  return useQuery({
    queryKey: CHARACTERS_QUERY_KEY,
    queryFn: () => client.characters.list(),
  });
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
      onPreviewsReady?: (previews: Preview[]) => string | null | undefined | Promise<string | null | undefined>;
    }
  | {
      from: "image";
      file: File | Blob;
      prompt: string;
      name?: string | null;
      /** Return a preview key to auto-confirm without waiting for manual confirm(). */
      onPreviewsReady?: (previews: Preview[]) => string | null | undefined | Promise<string | null | undefined>;
    };

type CreateFileParams = {
  from: "file";
  file: File | Blob | string;
  auto_rig?: boolean | null;
  front_facing?: boolean | null;
};

type ConfirmParams = {
  image_key: string;
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
 * **Text prompt or image** — two steps. Call generate(), then either:
 * - let `onPreviews` auto-select a key and complete automatically, or
 * - render `creator.previews`, then call `creator.confirm({ image_key })`.
 *
 * ```ts
 * // Auto-select first preview
 * creator.generate({ from: "prompt", prompt: "a knight in armor",
 *   onPreviewsReady: (previews) => previews[0].key });
 *
 * // Manual selection
 * creator.generate({ from: "image", file, prompt: "a knight" });
 * // ... render creator.previews, user picks one ...
 * creator.confirm({ image_key: selected });
 * ```
 */
export function useUthanaCreateCharacter() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<CreateCharacterStatus>("idle");
  const [data, setData] = useState<CreateCharacterData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [previews, setPreviews] = useState<Preview[] | null>(null);

  // Stored between generate() and confirm()
  const intermediateRef = useRef<{ character_id: string; prompt: string } | null>(null);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CHARACTERS_QUERY_KEY });
  }, [queryClient]);

  const reset = useCallback(() => {
    setStatus("idle");
    setData(null);
    setError(null);
    setPreviews(null);
    intermediateRef.current = null;
  }, []);

  /** Step 2 of the text/image flow — finalize using a selected preview key. */
  const confirm = useCallback(
    async (params: ConfirmParams) => {
      const intermediate = intermediateRef.current;
      if (!intermediate) {
        throw new Error("No pending generation. Call generate() first.");
      }
      setStatus("creating");
      try {
        const result = await client.characters.createFromGeneratedImage(
          intermediate.character_id,
          params.image_key,
          intermediate.prompt,
          { name: params.name },
        );
        setData(result);
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

  /** Step 1 of the text/image flow — generate preview images. */
  const generate = useCallback(
    async (params: GenerateParams) => {
      setStatus("generating");
      setError(null);
      setPreviews(null);
      intermediateRef.current = null;
      try {
        let character_id: string;
        let generatedPreviews: Preview[];

        if (params.from === "prompt") {
        const result = await client.characters.generateFromText(params.prompt);
        character_id = result.character_id;
        generatedPreviews = result.images;
      } else {
        const result = await client.characters.generateFromImage(params.file);
          character_id = result.character_id;
          generatedPreviews = [result.image];
        }

        intermediateRef.current = { character_id, prompt: params.prompt };
        setPreviews(generatedPreviews);
        setStatus("awaiting_selection");

        if (params.onPreviewsReady) {
          const selectedKey = await params.onPreviewsReady(generatedPreviews);
          if (selectedKey) {
            await confirm({ image_key: selectedKey, name: params.name });
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      }
    },
    [client, confirm],
  );

  /** Single-step file upload (GLB or FBX). */
  const create = useCallback(
    async (params: CreateFileParams) => {
      setStatus("creating");
      setError(null);
      try {
        const result = await client.characters.create(params.file, {
          auto_rig: params.auto_rig,
          front_facing: params.front_facing,
        });
        setData(result);
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
    /** Start a text-prompt or image generation flow (step 1 of 2). */
    generate,
    /** Confirm a generated preview and create the character (step 2 of 2). */
    confirm,
    /** Upload a GLB/FBX directly (single step). */
    create,
    /** Preview images returned by generate(). Render these for the user to pick from. */
    previews,
    /** True while generate() or create()/confirm() are in flight. */
    isPending: status === "generating" || status === "creating",
    isGenerating: status === "generating",
    /** True after generate() completes — previews are ready, waiting for confirm(). */
    isAwaitingSelection: status === "awaiting_selection",
    isCreating: status === "creating",
    isSuccess: status === "success",
    isError: status === "error",
    /** Final result — CreateCharacterResult (file upload) or CreateFromGeneratedImageResult (generate flow). */
    data,
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
