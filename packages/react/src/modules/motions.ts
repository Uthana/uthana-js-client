import type { ShareLink, ModifyMotionParams } from "@uthana/client";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type { MotionRatingValue, Motion, MotionPage, MotionPageOptions } from "@uthana/client";
/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUthanaClient, useUthanaQueryScope } from "../UthanaProvider";

const MOTIONS_QUERY_KEY = ["uthana", "motions"] as const;
const LOCOMOTION_STYLES_QUERY_KEY = ["uthana", "locomotion_styles"] as const;

/** Hook to list motions. */
export function useUthanaMotions() {
  const client = useUthanaClient();
  const { data: motions, ...rest } = useQuery({
    queryKey: MOTIONS_QUERY_KEY,
    queryFn: () => client.motions.list(),
  });
  return { motions, ...rest };
}

/** Hook to get a single motion by ID. Disabled when motionId is null. */
export function useUthanaMotion(motionId: string | null) {
  const client = useUthanaClient();
  const { data: motion, ...rest } = useQuery({
    queryKey: ["uthana", "motion", motionId] as const,
    queryFn: () => client.motions.get(motionId ?? ""),
    enabled: motionId != null && motionId !== "",
  });
  return { motion, ...rest };
}

/** Hook for the motion-viewer catalog (tags + org ownership). */
export function useUthanaMotionCatalog() {
  const client = useUthanaClient();
  const { data: catalog, ...rest } = useQuery({
    queryKey: ["uthana", "motion_catalog"] as const,
    queryFn: () => client.motions.catalog(),
  });
  return { catalog, ...rest };
}

/** Hook to trim a motion by normalized fractions. Invalidates motions on success. */
export function useUthanaTrimMotion() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { motionId: string; start: number; end: number; name: string }) =>
      client.motions.trim(params.motionId, params.start, params.end, params.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTIONS_QUERY_KEY });
    },
  });
}

/** Hook to create an enhanced stitched motion. Invalidates motions on success. */
export function useUthanaCreateStitchedMotion() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      characterId: string;
      prefix: Parameters<typeof client.motions.createStitchedMotion>[1];
      suffix: Parameters<typeof client.motions.createStitchedMotion>[2];
      timeoutSeconds?: number;
    }) =>
      client.motions.createStitchedMotion(params.characterId, params.prefix, params.suffix, {
        timeoutSeconds: params.timeoutSeconds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTIONS_QUERY_KEY });
    },
  });
}

/** Hook to create a looped motion. Invalidates motions on success. */
export function useUthanaCreateLoopedMotion() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      characterId: string;
      motionId: string;
      trimStartPct?: number;
      trimEndPct?: number;
      zoneDuration?: number;
      loopMode?: "closed" | "open";
      zoneMode?: "modify" | "extend";
      zoneEndPosition?: { x: number; y: number; facingAngle?: number } | null;
      timeoutSeconds?: number;
    }) =>
      client.motions.createLoopedMotion(params.characterId, params.motionId, {
        trimStartPct: params.trimStartPct,
        trimEndPct: params.trimEndPct,
        zoneDuration: params.zoneDuration,
        loopMode: params.loopMode,
        zoneMode: params.zoneMode,
        zoneEndPosition: params.zoneEndPosition,
        timeoutSeconds: params.timeoutSeconds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTIONS_QUERY_KEY });
    },
  });
}

/** Hook to fetch a motion preview WebM. Disabled when characterId or motionId is null. Does not charge download seconds. */
export function useUthanaMotionPreview(characterId: string | null, motionId: string | null) {
  const client = useUthanaClient();
  const { data: preview, ...rest } = useQuery({
    queryKey: ["uthana", "motion_preview", characterId, motionId] as const,
    queryFn: () => client.motions.preview(characterId ?? "", motionId ?? ""),
    enabled: characterId != null && characterId !== "" && motionId != null && motionId !== "",
  });
  return { preview, ...rest };
}

/** Hook to rate a motion (thumbs up/down). Invalidates motions on success. */
export function useUthanaRateMotion() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { motion_id: string; score: MotionRatingValue | 0 | 1 }) =>
      client.motions.rate(params.motion_id, params.score),
    retry: false,
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: MOTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["uthana", "motion", params.motion_id] });
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
      sourceMotionId?: string | null;
    }) =>
      client.motions.bakeWithChanges(params.gltf_content, params.motion_name, {
        character_id: params.character_id,
        sourceMotionId: params.sourceMotionId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTIONS_QUERY_KEY });
    },
  });
}

/** Hook to list locomotion style IDs for createLocomotion. */
export function useUthanaLocomotionStyles() {
  const client = useUthanaClient();
  const { data: styles, ...rest } = useQuery({
    queryKey: LOCOMOTION_STYLES_QUERY_KEY,
    queryFn: () => client.motions.listLocomotionStyles(),
  });
  return { styles, ...rest };
}

/** Hook to create locomotion; invalidates motions list on success. */
export function useUthanaCreateLocomotion() {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      character_id: string;
      strides?: number | null;
      move_speed?: number | null;
      style_id?: string | null;
      travel_angle?: number | null;
    }) =>
      client.motions.createLocomotion(params.character_id, {
        strides: params.strides,
        move_speed: params.move_speed,
        style_id: params.style_id,
        travel_angle: params.travel_angle,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOTIONS_QUERY_KEY });
    },
  });
}

/** Read one page. Include next_cursor in options to request the next page. */
export function useUthanaMotionsPaged(
  options: MotionPageOptions = {},
): UseQueryResult<MotionPage, Error> {
  const client = useUthanaClient();
  const scope = useUthanaQueryScope(client);
  return useQuery({
    queryKey: ["uthana", "motions", "paged", scope, options],
    queryFn: () => client.motions.listPaged(options),
    retry: false,
  });
}

/** Explicitly publish a public viewer link; never retry automatically. */
export function useUthanaShareMotion(): UseMutationResult<
  ShareLink,
  Error,
  { character_id: string; motion_id: string; start?: number; end?: number; timeoutSeconds?: number }
> {
  const client = useUthanaClient();
  return useMutation({
    mutationFn: (options: {
      character_id: string;
      motion_id: string;
      start?: number;
      end?: number;
      timeoutSeconds?: number;
    }) => client.motions.share(options.character_id, options.motion_id, options),
    retry: false,
  });
}

/** Change a motion's name or deleted state and refresh its queries. */
export function useUthanaModifyMotion(): UseMutationResult<Motion, Error, ModifyMotionParams> {
  const client = useUthanaClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: ModifyMotionParams) => client.motions.modify(params),
    retry: false,
    onSuccess: (_motion, params) => {
      queryClient.invalidateQueries({ queryKey: MOTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["uthana", "motion", params.motion_id] });
    },
  });
}
