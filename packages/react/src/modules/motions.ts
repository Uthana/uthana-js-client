/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUthanaClient } from "../UthanaProvider";

const MOTIONS_QUERY_KEY = ["uthana", "motions"] as const;

/** Hook to list motions. */
export function useUthanaMotions() {
  const client = useUthanaClient();
  return useQuery({
    queryKey: MOTIONS_QUERY_KEY,
    queryFn: () => client.motions.list(),
  });
}

/** Hook to get a single motion by ID. Disabled when motionId is null. */
export function useUthanaMotion(motionId: string | null) {
  const client = useUthanaClient();
  return useQuery({
    queryKey: ["uthana", "motion", motionId] as const,
    queryFn: () => client.motions.get(motionId ?? ""),
    enabled: motionId != null && motionId !== "",
  });
}

/** Hook to fetch a motion preview WebM. Disabled when characterId or motionId is null. Does not charge download seconds. */
export function useUthanaMotionPreview(characterId: string | null, motionId: string | null) {
  const client = useUthanaClient();
  return useQuery({
    queryKey: ["uthana", "motion_preview", characterId, motionId] as const,
    queryFn: () => client.motions.preview(characterId ?? "", motionId ?? ""),
    enabled: characterId != null && characterId !== "" && motionId != null && motionId !== "",
  });
}

/** Hook to rate a motion (thumbs up/down). Invalidates motions on success. */
export function useUthanaRateMotion() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { motion_id: string; score: 0 | 1; label_id?: string | null }) =>
      client.motions.rate(params.motion_id, params.score, {
        label_id: params.label_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTIONS_QUERY_KEY });
    },
  });
}

/**
 * Hook to bake custom GLTF animation data as a new motion for an existing character.
 * Invalidates the motions list on success.
 */
export function useUthanaBakeWithChanges() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      gltf_content: string;
      motion_name: string;
      character_id?: string | null;
    }) =>
      client.motions.bakeWithChanges(params.gltf_content, params.motion_name, {
        character_id: params.character_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTIONS_QUERY_KEY });
    },
  });
}
