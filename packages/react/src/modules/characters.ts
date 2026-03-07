/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/** Hook to create a character (upload). */
export function useUthanaCreateCharacter() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      file: File | Blob | string;
      auto_rig?: boolean | null;
      front_facing?: boolean | null;
    }) => client.characters.create(params.file, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTERS_QUERY_KEY });
    },
  });
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

/** Hook to generate character preview images from text. */
export function useUthanaGenerateCharacterFromText() {
  const client = useUthanaClient();
  return useMutation({
    mutationFn: (params: { prompt: string }) => client.characters.generate_from_text(params.prompt),
  });
}

/** Hook to generate a character preview image from an uploaded image. */
export function useUthanaGenerateCharacterFromImage() {
  const client = useUthanaClient();
  return useMutation({
    mutationFn: (params: { file: File | Blob }) =>
      client.characters.generate_from_image(params.file),
  });
}

/** Hook to create a character from a previously generated image. */
export function useUthanaCreateCharacterFromImage() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      character_id: string;
      image_key: string;
      prompt: string;
      name?: string | null;
    }) =>
      client.characters.create_from_generated_image(
        params.character_id,
        params.image_key,
        params.prompt,
        { name: params.name },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTERS_QUERY_KEY });
    },
  });
}
