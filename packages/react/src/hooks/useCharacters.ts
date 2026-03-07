/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUthanaClient } from "../UthanaProvider.js";

const CHARACTERS_QUERY_KEY = ["uthana", "characters"] as const;

/** Hook to list characters. */
export function useCharacters() {
  const client = useUthanaClient();
  return useQuery({
    queryKey: CHARACTERS_QUERY_KEY,
    queryFn: () => client.characters.list(),
  });
}

/** Hook to create a character (upload). */
export function useCreateCharacter() {
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
