/**
 * (c) Copyright 2026 Uthana, Inc. All Rights Reserved
 */

import { useMutation } from "@tanstack/react-query";
import type { TtmJobModelType, TtmModelType } from "@uthana/client";
import { useUthanaClient } from "../UthanaProvider";

/** Hook for text-to-motion mutations. */
export function useUthanaTtm() {
  const client = useUthanaClient();
  return useMutation({
    mutationFn: (params: {
      prompt: string;
      model?: TtmModelType | null;
      character_id?: string | null;
      foot_ik?: boolean | null;
      length?: number | null;
      cfg_scale?: number | null;
      seed?: number | null;
      internal_ik?: boolean | null;
    }) => client.ttm.create(params.prompt, params),
  });
}

/** Hook for async text-to-motion 3.0 job mutations. Returns a Job; poll with useUthanaJob(job.id). */
export function useUthanaCreateTtmJob() {
  const client = useUthanaClient();
  return useMutation({
    mutationFn: (params: {
      prompt: string;
      model: TtmJobModelType;
      character_id?: string | null;
      length?: number | null;
      rewrite_prompt?: boolean | null;
    }) => client.ttm.createJob(params.prompt, params),
  });
}
